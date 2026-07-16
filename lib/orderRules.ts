export const minimumOrderAmount = 100;
export const firstOrderOfferMinimumSubtotal = 250;
export const firstOrderOfferDiscount = 100;
export const firstOrderOfferCode = "FIRST100";

export function getMinimumOrderShortfall(cartTotal: number) {
  return Math.max(0, minimumOrderAmount - cartTotal);
}

export function canApplyFirstOrderOffer(cartSubtotal: number, isFirstOrder: boolean) {
  return isFirstOrder && cartSubtotal > firstOrderOfferMinimumSubtotal;
}

export function getFirstOrderOfferShortfall(cartSubtotal: number) {
  return Math.max(0, firstOrderOfferMinimumSubtotal + 1 - cartSubtotal);
}
