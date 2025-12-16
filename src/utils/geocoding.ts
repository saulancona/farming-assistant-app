/**
 * Geocoding utilities for converting coordinates to location names
 */

interface GeocodingResult {
  city: string;
  country: string;
  formattedLocation: string;
  success: boolean;
  error?: string;
}

/**
 * Reverse geocode coordinates to get city and country information
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  try {
    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      return {
        city: '',
        country: '',
        formattedLocation: '',
        success: false,
        error: 'Invalid coordinates provided'
      };
    }

    // Use Nominatim API for reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgroAfrica-App/1.0' // Required by Nominatim usage policy
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding API returned status ${response.status}`);
    }

    const data = await response.json();

    // Extract city and country from the response
    const address = data.address || {};

    // Try different fields for city (in order of preference)
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      '';

    const country = address.country || '';

    // Format the location string
    let formattedLocation = '';
    if (city && country) {
      formattedLocation = `${city}, ${country}`;
    } else if (city) {
      formattedLocation = city;
    } else if (country) {
      formattedLocation = country;
    } else {
      formattedLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    return {
      city,
      country,
      formattedLocation,
      success: true
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      city: '',
      country: '',
      formattedLocation: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate if coordinates are within valid ranges
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function(this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}
