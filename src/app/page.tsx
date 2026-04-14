import { DemoPanel } from "@/components/DemoPanel";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <DemoPanel />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
