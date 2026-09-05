"use client";

import {
  createContext,
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
      if (raw) setItems(JSON.parse(raw));
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

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const setQuantity = (id: string, quantity: number) =>
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );

  const clearCart = () => setItems([]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const registerCartIcon = (el: HTMLElement | null) => {
    cartIconRef.current = el;
  };
  const getCartIconRect = () => cartIconRef.current?.getBoundingClientRect() ?? null;

  const flyToCart = (from: DOMRect) => {
    const id = Date.now() + Math.random();
    setFlights((prev) => [...prev, { id, from }]);
  };
  const removeFlight = (id: number) =>
    setFlights((prev) => prev.filter((flight) => flight.id !== id));

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
