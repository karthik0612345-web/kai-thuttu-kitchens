export type DeliveryZone = {
  isEnabled: boolean;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const defaultDeliveryZone: DeliveryZone = {
  isEnabled: false,
  centerLatitude: 12.9786,
  centerLongitude: 77.364,
  radiusKm: 5,
};
export const freeDeliveryRadiusKm = 3;

export function parseCoordinatesFromMapsLink(value: string): Coordinates | null {
  const text = value.trim();

  if (!text) {
    return null;
  }

  const decodedText = decodeURIComponent(text);
  const patterns = [
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decodedText.match(pattern);

    if (!match) {
      continue;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkDeliveryZone(
  zone: DeliveryZone,
  customerCoordinates: Coordinates | null,
) {
  if (!zone.isEnabled) {
    return {
      canDeliver: true,
      distanceKm: null as number | null,
      message: "Delivery zone is not restricted.",
    };
  }

  if (!customerCoordinates) {
    return {
      canDeliver: false,
      distanceKm: null as number | null,
      message: "Add your exact Google Maps location to check delivery availability.",
    };
  }

  const distanceKm = getDistanceKm(
    {
      latitude: zone.centerLatitude,
      longitude: zone.centerLongitude,
    },
    customerCoordinates,
  );
  const canDeliver = distanceKm <= zone.radiusKm;

  return {
    canDeliver,
    distanceKm,
    message: canDeliver
      ? `Delivery available. Your location is ${distanceKm.toFixed(1)} km from our kitchen range center.`
      : `Sorry, food is not delivered to this location. Your location is ${distanceKm.toFixed(1)} km away, outside our ${zone.radiusKm} km delivery range.`,
  };
}

export function getDeliveryChargeMessage(distanceKm: number | null) {
  if (distanceKm === null) {
    return "Delivery charge will be confirmed after checking your location.";
  }

  if (distanceKm <= freeDeliveryRadiusKm) {
    return `Free delivery within ${freeDeliveryRadiusKm} km.`;
  }

  return `Porter charges will apply because your location is more than ${freeDeliveryRadiusKm} km from our kitchen.`;
}
