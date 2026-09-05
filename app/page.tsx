import Header from "@/src/components/Header";
import Hero from "@/src/components/Hero";
import Approach from "@/src/components/Approach";
import Catalog from "@/src/components/Catalog";
import Manifest from "@/src/components/Manifest";
import Footer from "@/src/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <Hero />
        <Approach />
        <Catalog />
        <Manifest />
      </main>
      <Footer />
    </>
  );
}
