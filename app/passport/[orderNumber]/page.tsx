import type { Metadata } from "next";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import CoffeePassportPage from "@/src/components/passport/CoffeePassportPage";

export const metadata: Metadata = {
  title: "Coffee Passport — XO COFFEE",
  description: "Ваша личная дегустационная запись для купленного кофе.",
};

export default async function PassportRoute({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <CoffeePassportPage orderNumber={orderNumber} />
      </main>
      <Footer />
    </>
  );
}
