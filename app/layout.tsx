import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { CatalogProvider } from "@/src/context/CatalogContext";
import { getCatalog } from "@/src/lib/store/catalog";
import { CartProvider } from "@/src/context/CartContext";
import { DiscoveryProvider } from "@/src/context/DiscoveryContext";
import CartDrawer from "@/src/components/CartDrawer";
import DiscoveryModal from "@/src/components/DiscoveryModal";
import FlyToCartLayer from "@/src/components/FlyToCartLayer";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "XO COFFEE — Pure Roast",
  description:
    "XO COFFEE Pure Roast — обжарка, которая раскрывает характер зерна, а не подгоняет его под один шаблон. Мы боремся за вкус.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Opt out of build-time prerendering so the Admin URL/secret are read at
  // request time, never baked into static HTML; freshness is then governed by
  // the fetch revalidate window in adminStoreClient.ts.
  await connection();
  const catalog = await getCatalog();

  return (
    <html
      lang="ru"
      className={`${playfair.variable} ${manrope.variable} h-full w-full max-w-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full w-full max-w-full flex-col overflow-x-hidden bg-background text-text font-sans">
        <CatalogProvider catalog={catalog}>
          <CartProvider>
            <DiscoveryProvider>
              {children}
              <CartDrawer />
              <DiscoveryModal />
              <FlyToCartLayer />
            </DiscoveryProvider>
          </CartProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
