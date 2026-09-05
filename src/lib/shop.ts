export const FREE_SHIPPING_THRESHOLD = 3000;
export const DELIVERY_FEE = 300;

export function getDeliveryFee(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DELIVERY_FEE;
}
