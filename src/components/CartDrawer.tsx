"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/src/context/CartContext";
import Drawer from "@/src/components/ui/Drawer";
import CartItemsView from "@/src/components/cart/CartItemsView";
import CheckoutForm, {
  type ContactInfo,
} from "@/src/components/cart/CheckoutForm";
import PaymentStep, { type OrderDetails } from "@/src/components/cart/PaymentStep";
import OrderSuccess from "@/src/components/cart/OrderSuccess";

type Step = "cart" | "checkout" | "payment" | "success";

export default function CartDrawer() {
  const { isOpen, closeCart, clearCart } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setStep("cart");
        setContactInfo(null);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleContactContinue = (info: ContactInfo) => {
    setContactInfo(info);
    setStep("payment");
  };

  const handleOrderConfirm = (order: OrderDetails) => {
    setCompletedOrder(order);
    setStep("success");
    clearCart();
  };

  const handleCloseAfterSuccess = () => {
    setCompletedOrder(null);
    closeCart();
  };

  const titles: Record<Step, string> = {
    cart: "Корзина",
    checkout: "Оформление заказа",
    payment: "Способ оплаты",
    success: "Готово",
  };

  return (
    <Drawer isOpen={isOpen} onClose={closeCart} ariaLabel="Корзина">
      <div className="flex items-center justify-between border-b border-charcoal/15 px-6 py-5">
        <h2 className="font-display text-xl font-semibold text-burgundy">
          {titles[step]}
        </h2>
        <button
          type="button"
          aria-label="Закрыть корзину"
          onClick={closeCart}
          className="flex h-11 w-11 items-center justify-center text-charcoal/60 transition-transform active:scale-90 hover:text-burgundy"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {step === "cart" && (
        <CartItemsView onCheckout={() => setStep("checkout")} />
      )}

      {step === "checkout" && (
        <CheckoutForm
          initialValues={contactInfo ?? undefined}
          onBack={() => setStep("cart")}
          onContinue={handleContactContinue}
        />
      )}

      {step === "payment" && contactInfo && (
        <PaymentStep
          contact={contactInfo}
          onBack={() => setStep("checkout")}
          onConfirm={handleOrderConfirm}
        />
      )}

      {step === "success" && completedOrder && (
        <OrderSuccess order={completedOrder} onClose={handleCloseAfterSuccess} />
      )}
    </Drawer>
  );
}
