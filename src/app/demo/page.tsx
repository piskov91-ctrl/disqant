import { Suspense } from "react";
import DemoClient from "./DemoClient";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

function DemoLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-zinc-500" role="status">
      Loading demo…
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
