import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { CITY_NAMES, TURKISH_CITIES } from '../constants/locations';

export interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
}

export const locationService = {
    /**
     * Request foreground location permissions
     */
    async requestPermissions(): Promise<boolean> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Get device current location
     */
    async getCurrentLocation(): Promise<LocationData | null> {
        try {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                console.warn('Location services are disabled on this device.');
                return null;
            }

            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return null;

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
        } catch (error) {
            console.warn('Error getting balanced location (silently handled)');
            try {
                // Fallback to low accuracy
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Low,
                });
                return {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
            } catch (fallbackError) {
                console.warn('Error getting low accuracy location (silently handled)');
                return null;
            }
        }
    },

    /**
     * Get fast location (last known or fast check)
     */
    async getFastLocation(): Promise<LocationData | null> {
        try {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) return null;

            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return null;

            // Try last known first (instant)
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                return {
                    latitude: lastKnown.coords.latitude,
                    longitude: lastKnown.coords.longitude,
                };
            }

            // Fallback to fast but fresh check
            const fastLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
            });

            return {
                latitude: fastLocation.coords.latitude,
                longitude: fastLocation.coords.longitude,
            };
        } catch (error) {
            return this.getCurrentLocation(); // Final fallback
        }
    },

    /**
     * Convert coordinates to human readable address
     */
    async reverseGeocode(latitude: number, longitude: number): Promise<LocationData | null> {
        try {
            // Some platforms require permission even for reverse geocoding
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                return null;
            }

            const results = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (results.length > 0) {
                const item = results[0];
                const rawCity = item.city || item.region || undefined;
                const rawDistrict = item.district || item.subregion || undefined;

                const normalizedCity = rawCity ? this.normalizeCity(rawCity) : undefined;
                const normalizedDistrict = (normalizedCity && rawDistrict)
                    ? this.normalizeDistrict(normalizedCity, rawDistrict)
                    : rawDistrict;

                return {
                    latitude,
                    longitude,
                    address: `${item.street || ''} ${item.streetNumber || ''}`.trim(),
                    city: normalizedCity,
                    district: normalizedDistrict,
                    neighborhood: item.name || undefined,
                };
            }
            return null;
        } catch (error: any) {
            if (error.message?.includes('Not authorized')) {
                console.warn('Location permissions not granted for reverse geocoding.');
            } else {
                console.error('Error in reverse geocoding:', error);
            }
            return null;
        }
    },

    /**
     * Convert address string to coordinates
     */
    async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
        try {
            const results = await Location.geocodeAsync(address);
            if (results.length > 0) {
                return {
                    latitude: results[0].latitude,
                    longitude: results[0].longitude,
                };
            }
            return null;
        } catch (error) {
            console.error('Error in geocoding:', error);
            return null;
        }
    },

    /**
     * Normalize city name to match our database constants
     * e.g. "Istanbul" -> "İstanbul", "ISTANBUL" -> "İstanbul"
     */
    normalizeCity(inputCity: string): string {
        if (!inputCity) return '';

        // Direct match first (case insensitive)
        const directMatch = CITY_NAMES.find(
            c => c.toLowerCase() === inputCity.toLowerCase()
        );
        if (directMatch) return directMatch;

        // Try to handle common Turkish character mappings manually if needed, 
        // or just rely on a simpler mapping for major cities if strictly needed.
        // For now, let's try a smarter mapping for Istanbul specifically as it is the most common issue.
        const normalizedInput = inputCity
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ş/g, 's')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');

        const found = CITY_NAMES.find(c => {
            const normalizedConst = c
                .toLowerCase()
                .replace(/ı/g, 'i')
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c');
            return normalizedConst === normalizedInput;
        });

        return found || inputCity; // Return canonical if found, otherwise original
    },

    /**
     * Normalize district name based on city
     */
    normalizeDistrict(inputCity: string, inputDistrict: string): string {
        if (!inputDistrict || !inputCity) return inputDistrict || '';

        const normalizedCity = this.normalizeCity(inputCity);
        // Find the city object
        const city = TURKISH_CITIES.find(c => c.name === normalizedCity);
        if (!city) return inputDistrict;

        // Direct match first
        const directMatch = city.districts.find(
            d => d.name.toLowerCase() === inputDistrict.toLowerCase()
        );
        if (directMatch) return directMatch.name;

        // Fuzzy match
        const normalizedInput = inputDistrict
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ş/g, 's')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');

        const found = city.districts.find(d => {
            const normalizedConst = d.name
                .toLowerCase()
                .replace(/ı/g, 'i')
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c');
            return normalizedConst === normalizedInput;
        });

        return found ? found.name : inputDistrict;
    }
};

export default locationService;
