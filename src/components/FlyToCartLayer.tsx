"use client";

import { useCart } from "@/src/context/CartContext";
import FlyingDot from "@/src/components/FlyingDot";

export default function FlyToCartLayer() {
  const { flights, removeFlight, getCartIconRect } = useCart();
  const to = getCartIconRect();

  if (!to) return null;

  return (
    <>
      {flights.map((flight) => (
        <FlyingDot
          key={flight.id}
          from={flight.from}
          to={to}
          onDone={() => removeFlight(flight.id)}
        />
      ))}
    </>
  );
}
