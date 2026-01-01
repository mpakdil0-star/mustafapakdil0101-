/**
 * Haversine formülü kullanarak iki koordinat arasındaki mesafeyi hesaplar (KM cinsinden)
 */
export const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371; // Dünyanın yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
};

/**
 * Verilen merkez ve yarıçap (km) için Bounding Box (sınırlayıcı kutu) hesaplar.
 * Veritabanı sorgularını hızlandırmak için kullanılır.
 */
export const getBoundingBox = (lat: number, lon: number, radiusKm: number) => {
    const latDelta = radiusKm / 111.32; // 1 derece enlem ~111.32 km
    const lonDelta = radiusKm / (111.32 * Math.cos(toRad(lat)));

    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLon: lon - lonDelta,
        maxLon: lon + lonDelta,
    };
};
