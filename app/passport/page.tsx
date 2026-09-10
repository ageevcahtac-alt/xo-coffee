import type { Metadata } from "next";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import MyCoffeePage from "@/src/components/passport/MyCoffeePage";

export const metadata: Metadata = {
  title: "Мой кофе — XO COFFEE",
  description: "Что вы уже пробовали и что может понравиться дальше.",
};

export default function MyCoffeeRoute() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <MyCoffeePage />
      </main>
      <Footer />
    </>
  );
}
