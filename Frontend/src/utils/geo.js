export const isValidCoordinate = (lat, lng) =>
  lat !== null &&
  lat !== undefined &&
  lng !== null &&
  lng !== undefined &&
  Number.isFinite(Number(lat)) &&
  Number.isFinite(Number(lng)) &&
  Math.abs(Number(lat)) <= 90 &&
  Math.abs(Number(lng)) <= 180;

/**
 * Two-tier device geolocation:
 * 1. Attempts high accuracy GPS first (6s timeout)
 * 2. Gracefully falls back to network/Wi-Fi triangulation if GPS times out
 */
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return reject({ code: 0, message: 'Geolocation is not supported by your browser.' });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => {
        // If high accuracy timed out or unavailable, try network/Wi-Fi triangulation
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => resolve(fallbackPos),
            (finalErr) => reject(finalErr),
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        } else {
          reject(err);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 15000,
      }
    );
  });
}

export function geoErrorMessage(err) {
  switch (err?.code) {
    case 1:
      return 'Location access was blocked. Please allow location permission in your browser or select an area below.';
    case 2:
      return 'Device location could not be determined. Please choose your locality from the list below.';
    case 3:
      return 'Location request timed out. Please try again or select your locality below.';
    case 0:
      return 'This browser does not support automatic location. Pick your locality below.';
    default:
      return err?.message || 'Could not retrieve location. Please choose your locality below.';
  }
}

/**
 * Accurate Haversine Distance calculation between two coordinate pairs in kilometers
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (!isValidCoordinate(nLat1, nLon1) || !isValidCoordinate(nLat2, nLon2)) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) *
      Math.cos(toRad(nLat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function formatDistance(val, fallback = '') {
  if (val === null || val === undefined) {
    return fallback;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (trimmed.toLowerCase().includes('km') || trimmed.toLowerCase().includes('m')) {
      return trimmed;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num) && num >= 0) {
      return `${num.toFixed(1)} km`;
    }
    return fallback;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 0) return fallback;
    return `${val.toFixed(1)} km`;
  }
  if (typeof val === 'object') {
    if (val.text && typeof val.text === 'string') {
      return val.text;
    }
    if (val.kilometers != null && Number.isFinite(Number(val.kilometers))) {
      return `${Number(val.kilometers).toFixed(1)} km`;
    }
    if (val.meters != null && Number.isFinite(Number(val.meters))) {
      const kmFromMeters = Number(val.meters) / 1000;
      return `${kmFromMeters.toFixed(1)} km`;
    }
    if (val.km != null && Number.isFinite(Number(val.km))) {
      return `${Number(val.km).toFixed(1)} km`;
    }
  }
  return fallback;
}

export function formatDuration(val, fallback = '') {
  if (val === null || val === undefined) {
    return fallback;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (
      trimmed.toLowerCase().includes('min') ||
      trimmed.toLowerCase().includes('sec') ||
      trimmed.toLowerCase().includes('hr')
    ) {
      return trimmed;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num) && num >= 0) {
      return `${Math.round(num)} mins`;
    }
    return fallback;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 0) return fallback;
    return `${Math.round(val)} mins`;
  }
  if (typeof val === 'object') {
    if (val.text && typeof val.text === 'string') {
      return val.text;
    }
    if (val.minutes != null && Number.isFinite(Number(val.minutes))) {
      return `${Math.round(Number(val.minutes))} mins`;
    }
    if (val.seconds != null && Number.isFinite(Number(val.seconds))) {
      const mins = Math.max(1, Math.round(Number(val.seconds) / 60));
      return `${mins} mins`;
    }
    if (val.mins != null && Number.isFinite(Number(val.mins))) {
      return `${Math.round(Number(val.mins))} mins`;
    }
  }
  return fallback;
}

/**
 * Curated authentic Hyderabad localities covering all zones and key hubs
 */
export const HYDERABAD_LOCALITIES = [
  {
    id: 'erragadda',
    label: 'Erragadda, Hyderabad',
    tag: 'Sultan Bhag / Gokul Theater',
    address: 'Sultan Bhag, Erragadda, Hyderabad - 500018',
    latitude: 17.4544,
    longitude: 78.4357,
    pincode: '500018',
  },
  {
    id: 'murad-nagar',
    label: 'Murad Nagar, Hyderabad',
    tag: 'Choti Masjid Hub',
    address: 'Near Choti Masjid, Murad Nagar, Hyderabad - 500028',
    latitude: 17.3824,
    longitude: 78.4418,
    pincode: '500028',
  },
  {
    id: 'zeba-bagh',
    label: 'Zeba Bagh, Murad Nagar',
    tag: 'Raghavendra Swamy Hall',
    address: 'Opp. Raghavendra Swamy Hall, Zeba Bagh, Murad Nagar, Hyderabad - 500028',
    latitude: 17.3868,
    longitude: 78.4408,
    pincode: '500028',
  },
  {
    id: 'syed-ali-guda',
    label: 'Syed Ali Guda, Hyderabad',
    tag: 'Murad Nagar Kaman',
    address: 'Syed Ali Guda, Near Murad Nagar Kaman, Hyderabad - 500028',
    latitude: 17.3842,
    longitude: 78.4468,
    pincode: '500028',
  },
  {
    id: 'asif-nagar',
    label: 'Asif Nagar / Jhirra',
    tag: 'Main Road Corridor',
    address: 'Asif Nagar Main Road, Jhirra, Hyderabad - 500028',
    latitude: 17.3885,
    longitude: 78.451,
    pincode: '500028',
  },
  {
    id: 'mehdipatnam',
    label: 'Mehdipatnam, Hyderabad',
    tag: 'Pillar 34 / Rythu Bazar',
    address: 'Near Rythu Bazar, Mehdipatnam, Hyderabad - 500028',
    latitude: 17.3916,
    longitude: 78.4398,
    pincode: '500028',
  },
  {
    id: 'ameerpet',
    label: 'Ameerpet, Hyderabad',
    tag: 'Metro Interchange / Maitrivanam',
    address: 'Ameerpet Circle, Hyderabad - 500016',
    latitude: 17.4375,
    longitude: 78.4482,
    pincode: '500016',
  },
  {
    id: 'sanath-nagar',
    label: 'Sanath Nagar, Hyderabad',
    tag: 'Industrial Estate / Metro',
    address: 'Sanath Nagar, Hyderabad - 500018',
    latitude: 17.4578,
    longitude: 78.4412,
    pincode: '500018',
  },
  {
    id: 'sr-nagar',
    label: 'SR Nagar, Hyderabad',
    tag: 'Sanjeeva Reddy Nagar Colony',
    address: 'SR Nagar Main Road, Hyderabad - 500038',
    latitude: 17.4435,
    longitude: 78.4428,
    pincode: '500038',
  },
  {
    id: 'banjara-hills',
    label: 'Banjara Hills, Hyderabad',
    tag: 'Road No. 1 / Care Hospital',
    address: 'Road No. 1, Banjara Hills, Hyderabad - 500034',
    latitude: 17.4156,
    longitude: 78.435,
    pincode: '500034',
  },
  {
    id: 'jubilee-hills',
    label: 'Jubilee Hills, Hyderabad',
    tag: 'Road No. 36 / Checkpost',
    address: 'Road No. 36, Jubilee Hills, Hyderabad - 500033',
    latitude: 17.4319,
    longitude: 78.4073,
    pincode: '500033',
  },
  {
    id: 'tolichowki',
    label: 'Tolichowki, Hyderabad',
    tag: 'Paramount Colony / Flyover',
    address: 'Paramount Colony, Tolichowki, Hyderabad - 500008',
    latitude: 17.4014,
    longitude: 78.4118,
    pincode: '500008',
  },
  {
    id: 'masab-tank',
    label: 'Masab Tank, Hyderabad',
    tag: 'NMDC / Shantinagar',
    address: 'NMDC Area, Masab Tank, Hyderabad - 500028',
    latitude: 17.4042,
    longitude: 78.4525,
    pincode: '500028',
  },
  {
    id: 'lakdikapul',
    label: 'Lakdikapul, Hyderabad',
    tag: 'Saifabad / Niloufer Hospital',
    address: 'Saifabad, Lakdikapul, Hyderabad - 500004',
    latitude: 17.405,
    longitude: 78.465,
    pincode: '500004',
  },
  {
    id: 'nampally',
    label: 'Nampally, Hyderabad',
    tag: 'Station Road / Public Gardens',
    address: 'Nampally Station Road, Hyderabad - 500001',
    latitude: 17.392,
    longitude: 78.468,
    pincode: '500001',
  },
  {
    id: 'charminar',
    label: 'Charminar, Hyderabad',
    tag: 'Laad Bazaar / Old City',
    address: 'Near Charminar, Hyderabad - 500002',
    latitude: 17.3616,
    longitude: 78.4747,
    pincode: '500002',
  },
  {
    id: 'begumpet',
    label: 'Begumpet, Hyderabad',
    tag: 'Prakash Nagar / Airport Road',
    address: 'Prakash Nagar, Begumpet, Hyderabad - 500016',
    latitude: 17.4447,
    longitude: 78.4664,
    pincode: '500016',
  },
  {
    id: 'secunderabad',
    label: 'Secunderabad, Hyderabad',
    tag: 'Railway Station / Clock Tower',
    address: 'Station Road, Secunderabad - 500003',
    latitude: 17.4399,
    longitude: 78.4983,
    pincode: '500003',
  },
  {
    id: 'kukatpally',
    label: 'Kukatpally, Hyderabad',
    tag: 'KPHB Colony / Metro',
    address: 'KPHB Colony, Kukatpally, Hyderabad - 500072',
    latitude: 17.4938,
    longitude: 78.3995,
    pincode: '500072',
  },
  {
    id: 'hitec-city',
    label: 'Hitec City, Hyderabad',
    tag: 'Cyber Towers / Inorbit',
    address: 'Cyber Towers, Hitec City, Hyderabad - 500081',
    latitude: 17.4504,
    longitude: 78.3808,
    pincode: '500081',
  },
  {
    id: 'gachibowli',
    label: 'Gachibowli, Hyderabad',
    tag: 'Financial District / ORR',
    address: 'Financial District, Gachibowli, Hyderabad - 500032',
    latitude: 17.4401,
    longitude: 78.3489,
    pincode: '500032',
  },
  {
    id: 'dattadari-colony',
    label: 'Dattadari Colony, Hyderabad',
    tag: 'Gudimalkapur Road',
    address: 'Dattadari Colony, Gudimalkapur Road, Hyderabad - 500028',
    latitude: 17.3808,
    longitude: 78.4452,
    pincode: '500028',
  },
  {
    id: 'alapathi-nagar',
    label: 'Alapathi Nagar, Asif Nagar',
    tag: 'Alapathi Main Road',
    address: 'Alapathi Main Road, Asif Nagar, Hyderabad - 500028',
    latitude: 17.3852,
    longitude: 78.4382,
    pincode: '500028',
  },
  {
    id: 'viswash-nagar',
    label: 'Viswash Nagar, Hyderabad',
    tag: 'Viswash Nagar Colony',
    address: 'Viswash Nagar Colony, Hyderabad - 500028',
    latitude: 17.3812,
    longitude: 78.4392,
    pincode: '500028',
  },
];

export function getNearestLocality(lat, lng) {
  if (!isValidCoordinate(lat, lng)) return null;
  let closest = null;
  let minDistance = Infinity;

  for (const loc of HYDERABAD_LOCALITIES) {
    const dist = haversineDistanceKm(lat, lng, loc.latitude, loc.longitude);
    if (dist !== null && dist < minDistance) {
      minDistance = dist;
      closest = { ...loc, distanceKm: dist };
    }
  }

  return closest;
}

export function getNearestLocalityLabel(lat, lng) {
  const closest = getNearestLocality(lat, lng);
  if (!closest) return null;
  if (closest.distanceKm <= 4.0) {
    return closest.label;
  }
  return `Near ${closest.label}`;
}
