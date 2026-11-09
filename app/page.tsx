import Header from "@/src/components/Header";
import Hero from "@/src/components/Hero";
import TrustBar from "@/src/components/TrustBar";
import Catalog from "@/src/components/Catalog";
import PureRoastBlock from "@/src/components/PureRoastBlock";
import PassportBlock from "@/src/components/PassportBlock";
import HowToBuy from "@/src/components/HowToBuy";
import AboutBlock from "@/src/components/AboutBlock";
import FAQ from "@/src/components/FAQ";
import Footer from "@/src/components/Footer";
import { getLotImageMap } from "@/src/lib/serverAssets";

export default async function Home() {
  // SERVER-ONLY значения, прокидываемые в клиентские компоненты пропсами
  // (никаких NEXT_PUBLIC_): базовый хост Coffee Passport для ссылок лотов и
  // манифест существующих фото пачек.
  const [passportBaseUrl, lotImages] = await Promise.all([
    Promise.resolve(process.env.COFFEE_PASSPORT_PUBLIC_BASE_URL),
    getLotImageMap(),
  ]);
  return (
    <>
      <Header />
      <main className="flex-1 pt-32 lg:pt-20">
        <Hero />
        <TrustBar />
        <Catalog passportBaseUrl={passportBaseUrl} lotImages={lotImages} />
        <PureRoastBlock />
        <PassportBlock passportBaseUrl={passportBaseUrl} />
        <HowToBuy />
        <AboutBlock />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
