import { Suspense } from "react";
import DemoClient from "./DemoClient";

export const dynamic = "force-dynamic";

function DemoLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-zinc-500" role="status">
      Loading demo…
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<DemoLoading />}>
      <DemoClient />
    </Suspense>
  );
}

