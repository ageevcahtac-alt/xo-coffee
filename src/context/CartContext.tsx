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

export type CartItem = {
  id: string;
  name: string;
  country: string;
  price: number;
  quantity: number;
};

type Flight = {
  id: number;
  from: DOMRect;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
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

// A cart line nobody would actually want — well past anything the stepper
// UI could produce by hand — but a sane ceiling to clamp corrupted or
// hand-edited storage to, rather than trusting an arbitrary number into the
// totals.
const MAX_LINE_QUANTITY = 99;

/**
 * Validates one cart item read back from localStorage. Same reasoning as
 * src/lib/coffeePassport.ts's readArray: a corrupted or hand-edited value
 * is dropped rather than trusted, so one bad line can't poison totalPrice/
 * totalCount with NaN or a negative number, or crash rendering.
 */
function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    typeof item.country === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
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
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_LINE_QUANTITY) }
            : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }];
    });
  }, []);

  const removeItem = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    [],
  );

  const setQuantity = useCallback(
    (id: string, quantity: number) =>
      setItems((prev) =>
        // Not `<= 0`: NaN fails every comparison, so a NaN quantity would
        // otherwise fall through and get written into state instead of
        // removing the line or being clamped.
        !Number.isFinite(quantity) || quantity <= 0
          ? prev.filter((i) => i.id !== id)
          : prev.map((i) =>
              i.id === id ? { ...i, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : i,
            ),
      ),
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
