export const minimumOrderAmount = 100;

export function getMinimumOrderShortfall(cartTotal: number) {
  return Math.max(0, minimumOrderAmount - cartTotal);
}
