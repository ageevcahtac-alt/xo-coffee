"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCatalog } from "@/src/context/CatalogContext";
import { reconcileCartItems } from "@/src/lib/cartReconcile";
import {
  MAX_LINE_QUANTITY,
  addCartItem,
  isValidCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/src/lib/cartItems";

export type { CartItem };

type Flight = {
  id: number;
  from: DOMRect;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalCount: number;
  totalPrice: number;
  registerCartIcon: (el: HTMLElement | null) => void;
  getCartIconRect: () => DOMRect | null;
  flights: Flight[];
  flyToCart: (from: DOMRect) => void;
  removeFlight: (id: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "xo-coffee-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { status: catalogStatus, lots: catalogLots } = useCatalog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const cartIconRef = useRef<HTMLElement | null>(null);

  // One-time sync from localStorage on mount: SSR has no access to it, so the
  // cart must start empty on the server and adopt the stored value client-side
  // to avoid a hydration mismatch — the extra render this causes is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(isValidCartItem).map((item) => ({
              ...item,
              quantity: Math.min(item.quantity, MAX_LINE_QUANTITY),
            })),
          );
        }
        // A non-array value (corrupted format, or a stray `null`/object from
        // a hand-edited key) is dropped — items stays at its empty default
        // rather than crashing downstream reduces.
      }
    } catch {
      // ignore corrupted/unavailable storage
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Only against a successfully loaded catalog — an Admin outage must never
  // wipe a customer's cart.
  useEffect(() => {
    if (!hydrated || catalogStatus !== "ok") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems((prev) => reconcileCartItems(prev, catalogLots));
  }, [hydrated, catalogStatus, catalogLots]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write failures (e.g. private mode)
    }
  }, [items, hydrated]);

  // Stable references throughout: this value object is rebuilt below on
  // every render regardless (its own identity always changes, same as
  // before), but useDialogFocus's Escape handling now depends on onClose's
  // identity — an unstable closeCart would otherwise retrigger that effect,
  // and lose queued focus work, on every unrelated CartProvider re-render.
  const addItem: CartContextValue["addItem"] = useCallback((item, quantity = 1) => {
    setItems((prev) => addCartItem(prev, item, quantity));
  }, []);

  const removeItem = useCallback(
    (variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)),
    [],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      setItems((prev) => setCartItemQuantity(prev, variantId, quantity)),
    [],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    cartIconRef.current = el;
  }, []);
  const getCartIconRect = useCallback(
    () => cartIconRef.current?.getBoundingClientRect() ?? null,
    [],
  );

  const flyToCart = useCallback((from: DOMRect) => {
    const id = Date.now() + Math.random();
    setFlights((prev) => [...prev, { id, from }]);
  }, []);
  const removeFlight = useCallback(
    (id: number) => setFlights((prev) => prev.filter((flight) => flight.id !== id)),
    [],
  );

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isOpen,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      totalCount,
      totalPrice,
      registerCartIcon,
      getCartIconRect,
      flights,
      flyToCart,
      removeFlight,
    }),
    [
      items,
      isOpen,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
      totalCount,
      totalPrice,
      registerCartIcon,
      getCartIconRect,
      flights,
      flyToCart,
      removeFlight,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
