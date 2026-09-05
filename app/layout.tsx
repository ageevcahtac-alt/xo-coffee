import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/src/context/CartContext";
import CartDrawer from "@/src/components/CartDrawer";
import FlyToCartLayer from "@/src/components/FlyToCartLayer";
import FixedBackdrop from "@/src/components/FixedBackdrop";

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
    "XO COFFEE Pure Roast — светлая обжарка, которая не прячет вкус зерна. Мы боремся за вкус.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${playfair.variable} ${manrope.variable} h-full w-full max-w-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full w-full max-w-full flex-col overflow-x-hidden text-charcoal font-sans">
        <FixedBackdrop />
        <CartProvider>
          {children}
          <CartDrawer />
          <FlyToCartLayer />
        </CartProvider>
      </body>
    </html>
  );
}
