import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
  setStoredSubscriptionPlanCatalog,
  type StoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";
import {
  computeSubscriptionPlanProfit,
  recommendedProfitMarginPlanKey,
} from "@/lib/subscriptionPlanProfit";
import { syncSubscriptionPlanStripePrices } from "@/lib/subscriptionPlanStripeSync";
import {
  SUBSCRIPTION_CATALOG_PRICE_REVISION,
  SUBSCRIPTION_PLAN_KEYS_ORDERED,
  type SubscriptionPlanKey,
} from "@/lib/subscriptionPlansData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

function catalogResponse(stored: StoredSubscriptionPlanCatalog) {
  const profitRows = SUBSCRIPTION_PLAN_KEYS_ORDERED.map((key) =>
    computeSubscriptionPlanProfit(key, stored.plans[key], stored.costPerTryOnGbp),
  );
  return {
    costPerTryOnGbp: stored.costPerTryOnGbp,
    plans: stored.plans,
    profitRows,
    recommendedPlanKey: recommendedProfitMarginPlanKey(profitRows),
  };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const stored = (await getStoredSubscriptionPlanCatalog()) ?? defaultStoredSubscriptionPlanCatalog();
    return Response.json(catalogResponse(stored));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load subscription plans.";
    return Response.json({ error: message }, { status: 503 });
  }
}

type PostBody = {
  costPerTryOnGbp?: unknown;
  plans?: Partial<Record<SubscriptionPlanKey, unknown>>;
};

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const base = (await getStoredSubscriptionPlanCatalog()) ?? defaultStoredSubscriptionPlanCatalog();
  const costRaw = body.costPerTryOnGbp;
  const costN = typeof costRaw === "number" ? costRaw : Number.parseFloat(String(costRaw ?? ""));
  if (!Number.isFinite(costN) || costN < 0) {
    return Response.json({ error: "Cost per try-on must be a non-negative number." }, { status: 400 });
  }

  const plans = { ...base.plans };
  const incoming = body.plans;
  if (!incoming || typeof incoming !== "object") {
    return Response.json({ error: "Plans object is required." }, { status: 400 });
  }

  for (const key of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const raw = incoming[key];
    if (!raw || typeof raw !== "object") {
      return Response.json({ error: `Missing plan: ${key}.` }, { status: 400 });
    }
    const o = raw as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const amountGbpPence = Math.floor(Number(o.amountGbpPence));
    const tryOnLimit = Math.floor(Number(o.tryOnLimit));
    if (!name.length) {
      return Response.json({ error: `Plan ${key}: name is required.` }, { status: 400 });
    }
    if (!Number.isFinite(amountGbpPence) || amountGbpPence <= 0) {
      return Response.json({ error: `Plan ${key}: price must be a positive integer (pence).` }, { status: 400 });
    }
    if (!Number.isFinite(tryOnLimit) || tryOnLimit <= 0) {
      return Response.json({ error: `Plan ${key}: try-on limit must be a positive integer.` }, { status: 400 });
    }
    const maxRaw = o.maxTopUpPurchasesPerBillingCycle;
    const maxTopUpPurchasesPerBillingCycle =
      maxRaw === undefined || maxRaw === null
        ? base.plans[key].maxTopUpPurchasesPerBillingCycle
        : Math.floor(Number(maxRaw));
    const prev = base.plans[key];
    plans[key] = {
      name: name.slice(0, 80),
      amountGbpPence,
      tryOnLimit,
      ...(typeof maxTopUpPurchasesPerBillingCycle === "number" &&
      Number.isFinite(maxTopUpPurchasesPerBillingCycle) &&
      maxTopUpPurchasesPerBillingCycle > 0
        ? { maxTopUpPurchasesPerBillingCycle }
        : {}),
      ...(prev.stripeProductId ? { stripeProductId: prev.stripeProductId } : {}),
      ...(prev.stripePriceId ? { stripePriceId: prev.stripePriceId } : {}),
    };
  }

  const next: StoredSubscriptionPlanCatalog = {
    costPerTryOnGbp: costN,
    plans,
    priceRevision: SUBSCRIPTION_CATALOG_PRICE_REVISION,
  };

  try {
    const { catalog: synced, subscriptionMigrations, stripePriceEnv } = await syncSubscriptionPlanStripePrices({
      catalog: next,
      previous: base,
    });
    await setStoredSubscriptionPlanCatalog(synced);

    const totalUpdated = subscriptionMigrations.reduce((n, m) => n + m.updatedCount, 0);
    const migrationErrors = subscriptionMigrations.flatMap((m) => m.errors);

    return Response.json({
      ok: true,
      ...catalogResponse(synced),
      stripePriceEnv,
      subscriptionMigrations,
      subscriptionMigrationSummary: {
        updatedCount: totalUpdated,
        errors: migrationErrors,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save subscription plans.";
    return Response.json({ error: message }, { status: 503 });
  }
}
