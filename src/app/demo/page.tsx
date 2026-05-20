import type { Metadata } from "next";
import { Suspense } from "react";
import DemoClient from "./DemoClient";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Try It Free",
  description: "Experience Wear Me virtual try-on on sample products—no signup required.",
};

function DemoLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-zinc-500" role="status">
      Loading Try It Free…
    </div>
  );
}

export default async function DemoPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<DemoLoading />}>
        <DemoClient />
      </Suspense>
    </>
  );
}
