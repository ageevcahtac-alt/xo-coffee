export function generateOrderNumber() {
  return `XO-${Math.floor(100000 + Math.random() * 900000)}`;
}
