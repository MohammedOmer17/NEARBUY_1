const https = require("https");

const validateCoordinates = (location, label = "Location") => {
  if (!location || typeof location !== "object") {
    throw new Error(`${label} is required`);
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`${label} must contain valid latitude and longitude numbers`);
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error(`${label} latitude must be between -90 and 90`);
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error(`${label} longitude must be between -180 and 180`);
  }

  return { latitude, longitude };
};

const getGoogleApiKey = () => {
  const apiKey = process.env.GOOGLE_MAP_API;

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    const error = new Error("Google Maps API key is not configured");
    error.code = "GOOGLE_MAPS_CONFIG_ERROR";
    throw error;
  }

  return apiKey.trim();
};

const googleRequest = async (url) => {
  const apiKey = getGoogleApiKey();

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const chunks = [];

      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const rawResponse = Buffer.concat(chunks).toString("utf8");

        if (!rawResponse) {
          reject(new Error("Empty Google Maps response"));
          return;
        }

        try {
          const parsed = JSON.parse(rawResponse);

          if (response.statusCode >= 400) {
            reject(new Error(parsed?.error_message || "Google Maps request failed"));
            return;
          }

          if (parsed?.status && ["REQUEST_DENIED", "INVALID_REQUEST", "OVER_QUERY_LIMIT", "ZERO_RESULTS"].includes(parsed.status)) {
            reject(new Error(parsed.error_message || parsed.status || "Google Maps request failed"));
            return;
          }

          resolve(parsed);
        } catch (error) {
          reject(new Error("Invalid Google Maps response"));
        }
      });
    });

    request.on("error", (error) => reject(error));
    request.setTimeout(15000, () => {
      request.destroy(new Error("Google Maps request timed out"));
    });
  });
};

const normalizeDistance = (meters) => {
  const safeMeters = Number(meters) || 0;

  return {
    meters: safeMeters,
    kilometers: Number((safeMeters / 1000).toFixed(2)),
  };
};

const normalizeDuration = (seconds) => {
  const safeSeconds = Number(seconds) || 0;

  return {
    seconds: safeSeconds,
    minutes: Number((safeSeconds / 60).toFixed(2)),
  };
};

const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateDistanceAndDuration = async (origin, destination) => {
  const validatedOrigin = validateCoordinates(origin, "Origin");
  const validatedDestination = validateCoordinates(destination, "Destination");

  try {
    const apiKey = getGoogleApiKey();
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${validatedOrigin.latitude},${validatedOrigin.longitude}&destinations=${validatedDestination.latitude},${validatedDestination.longitude}&key=${apiKey}`;
    const data = await googleRequest(url);
    const element = data?.rows?.[0]?.elements?.[0];

    if (element && element.status !== "ZERO_RESULTS" && element.distance?.value !== undefined) {
      return {
        distance: normalizeDistance(element.distance?.value),
        duration: normalizeDuration(element.duration?.value),
      };
    }
  } catch (error) {
    // Google Maps API unavailable or legacy error: graceful fallback to Haversine distance
  }

  const km = calculateHaversineDistanceKm(
    validatedOrigin.latitude,
    validatedOrigin.longitude,
    validatedDestination.latitude,
    validatedDestination.longitude
  );
  const meters = Math.round(km * 1000);
  const durationSeconds = Math.round((km / 20) * 3600); // estimated 20 km/h urban speed

  return {
    distance: {
      meters,
      kilometers: Number(km.toFixed(2)),
    },
    duration: {
      seconds: durationSeconds,
      minutes: Number((durationSeconds / 60).toFixed(2)),
    },
  };
};

const decodePolyline = (encoded) => {
  if (!encoded) return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
};

const fetchOsrmRoute = async (origin, destination) => {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const req = https.get(
      url,
      { headers: { "User-Agent": "NearBuy-Hyperlocal-Platform/1.0" } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            const data = JSON.parse(buf);
            if (data.code === "Ok" && data.routes && data.routes[0]) {
              const route = data.routes[0];
              const coordinates = (route.geometry?.coordinates || []).map((coord) => [coord[1], coord[0]]);
              resolve({
                distance: normalizeDistance(route.distance),
                duration: normalizeDuration(route.duration),
                route: {
                  coordinates,
                  source: "osrm",
                },
              });
              return;
            }
          } catch {
            // ignore
          }
          resolve(null);
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
};

const calculateRoute = async (origin, destination) => {
  const validatedOrigin = validateCoordinates(origin, "Origin");
  const validatedDestination = validateCoordinates(destination, "Destination");

  // 1. Attempt Google Maps Directions API if configured
  try {
    const apiKey = getGoogleApiKey();
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${validatedOrigin.latitude},${validatedOrigin.longitude}&destination=${validatedDestination.latitude},${validatedDestination.longitude}&key=${apiKey}`;
    const data = await googleRequest(url);
    const route = data?.routes?.[0];

    if (route && route.legs?.[0]) {
      const leg = route.legs[0];
      const totalDistance = leg.distance?.value || 0;
      const totalDuration = leg.duration?.value || 0;
      const encodedPolyline = route.overview_polyline?.points || null;
      const coordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [];

      return {
        distance: normalizeDistance(totalDistance),
        duration: normalizeDuration(totalDuration),
        route: {
          encodedPolyline,
          coordinates,
          source: "google_maps",
        },
      };
    }
  } catch (error) {
    // Google Maps API unavailable or legacy error: fall through to OSRM
  }

  // 2. OpenStreetMap OSRM driving route API (real road geometry and turn-by-turn routing)
  try {
    const osrmResult = await fetchOsrmRoute(validatedOrigin, validatedDestination);
    if (osrmResult) {
      return osrmResult;
    }
  } catch (error) {
    // OSRM failed, fall through to haversine fallback
  }

  // 3. Fallback to Haversine distance with direct origin-destination path
  const km = calculateHaversineDistanceKm(
    validatedOrigin.latitude,
    validatedOrigin.longitude,
    validatedDestination.latitude,
    validatedDestination.longitude
  );
  const meters = Math.round(km * 1000);
  const durationSeconds = Math.round((km / 20) * 3600);

  return {
    distance: {
      meters,
      kilometers: Number(km.toFixed(2)),
    },
    duration: {
      seconds: durationSeconds,
      minutes: Number((durationSeconds / 60).toFixed(2)),
    },
    route: {
      encodedPolyline: null,
      coordinates: [
        [validatedOrigin.latitude, validatedOrigin.longitude],
        [validatedDestination.latitude, validatedDestination.longitude],
      ],
      source: "haversine_direct",
    },
  };
};

const getCaptainToShopRoute = async (captainLocation, shopLocation) => {
  return calculateRoute(captainLocation, shopLocation);
};

const getCaptainToCustomerRoute = async (captainLocation, customerLocation) => {
  return calculateRoute(captainLocation, customerLocation);
};

const getShopToCustomerRoute = async (shopLocation, customerLocation) => {
  return calculateRoute(shopLocation, customerLocation);
};

const HYDERABAD_FALLBACK_LOCALITIES = [
  { id: 'erragadda', label: 'Erragadda, Hyderabad', address: 'Sultan Bhag, Erragadda, Hyderabad - 500018', latitude: 17.4544, longitude: 78.4357, pincode: '500018' },
  { id: 'murad-nagar', label: 'Murad Nagar, Hyderabad', address: 'Near Choti Masjid, Murad Nagar, Hyderabad - 500028', latitude: 17.3824, longitude: 78.4418, pincode: '500028' },
  { id: 'zeba-bagh', label: 'Zeba Bagh, Murad Nagar', address: 'Raghavendra Swamy Hall, Zeba Bagh, Murad Nagar, Hyderabad - 500028', latitude: 17.3868, longitude: 78.4408, pincode: '500028' },
  { id: 'syed-ali-guda', label: 'Syed Ali Guda, Hyderabad', address: 'Murad Nagar Kaman, Syed Ali Guda, Hyderabad - 500028', latitude: 17.3842, longitude: 78.4468, pincode: '500028' },
  { id: 'asif-nagar', label: 'Asif Nagar / Jhirra', address: 'Main Road Corridor, Asif Nagar, Hyderabad - 500028', latitude: 17.3885, longitude: 78.4510, pincode: '500028' },
  { id: 'mehdipatnam', label: 'Mehdipatnam, Hyderabad', address: 'Rythu Bazar, Mehdipatnam, Hyderabad - 500028', latitude: 17.3916, longitude: 78.4398, pincode: '500028' },
  { id: 'ameerpet', label: 'Ameerpet, Hyderabad', address: 'Ameerpet Metro Interchange, Hyderabad - 500016', latitude: 17.4375, longitude: 78.4482, pincode: '500016' },
  { id: 'sanath-nagar', label: 'Sanath Nagar, Hyderabad', address: 'Sanath Nagar, Hyderabad - 500018', latitude: 17.4578, longitude: 78.4412, pincode: '500018' },
  { id: 'sr-nagar', label: 'SR Nagar, Hyderabad', address: 'SR Nagar Colony, Hyderabad - 500038', latitude: 17.4435, longitude: 78.4428, pincode: '500038' },
  { id: 'banjara-hills', label: 'Banjara Hills, Hyderabad', address: 'Road No. 1, Banjara Hills, Hyderabad - 500034', latitude: 17.4156, longitude: 78.4350, pincode: '500034' },
  { id: 'jubilee-hills', label: 'Jubilee Hills, Hyderabad', address: 'Road No. 36, Jubilee Hills, Hyderabad - 500033', latitude: 17.4319, longitude: 78.4073, pincode: '500033' },
  { id: 'tolichowki', label: 'Tolichowki, Hyderabad', address: 'Paramount Colony, Tolichowki, Hyderabad - 500008', latitude: 17.4014, longitude: 78.4118, pincode: '500008' },
  { id: 'masab-tank', label: 'Masab Tank, Hyderabad', address: 'NMDC, Masab Tank, Hyderabad - 500028', latitude: 17.4042, longitude: 78.4525, pincode: '500028' },
  { id: 'lakdikapul', label: 'Lakdikapul, Hyderabad', address: 'Saifabad, Lakdikapul, Hyderabad - 500004', latitude: 17.4050, longitude: 78.4650, pincode: '500004' },
  { id: 'charminar', label: 'Charminar, Hyderabad', address: 'Laad Bazaar, Charminar, Hyderabad - 500002', latitude: 17.3616, longitude: 78.4747, pincode: '500002' },
  { id: 'begumpet', label: 'Begumpet, Hyderabad', address: 'Prakash Nagar, Begumpet, Hyderabad - 500016', latitude: 17.4447, longitude: 78.4664, pincode: '500016' },
  { id: 'secunderabad', label: 'Secunderabad, Hyderabad', address: 'Station Road, Secunderabad - 500003', latitude: 17.4399, longitude: 78.4983, pincode: '500003' },
  { id: 'kukatpally', label: 'Kukatpally, Hyderabad', address: 'KPHB Colony, Kukatpally, Hyderabad - 500072', latitude: 17.4938, longitude: 78.3995, pincode: '500072' },
  { id: 'hitec-city', label: 'Hitec City, Hyderabad', address: 'Cyber Towers, Hitec City, Hyderabad - 500081', latitude: 17.4504, longitude: 78.3808, pincode: '500081' },
  { id: 'gachibowli', label: 'Gachibowli, Hyderabad', address: 'Financial District, Gachibowli, Hyderabad - 500032', latitude: 17.4401, longitude: 78.3489, pincode: '500032' },
];

const findClosestLocality = (latitude, longitude) => {
  let closest = HYDERABAD_FALLBACK_LOCALITIES[0];
  let minDistance = Infinity;

  for (const loc of HYDERABAD_FALLBACK_LOCALITIES) {
    const dist = calculateHaversineDistanceKm(latitude, longitude, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  return { ...closest, distanceKm: Number(minDistance.toFixed(2)) };
};

const reverseGeocodeLocation = async (latitude, longitude) => {
  const coords = validateCoordinates({ latitude, longitude });

  // 1. Attempt Google Maps Reverse Geocode if configured
  try {
    const apiKey = getGoogleApiKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}`;
    const data = await googleRequest(url);
    if (data?.results?.[0]) {
      const top = data.results[0];
      const components = top.address_components || [];
      const getComp = (type) => components.find((c) => c.types.includes(type))?.long_name;
      const locality = getComp("sublocality") || getComp("neighborhood") || getComp("locality") || "Hyderabad";
      const pincode = getComp("postal_code") || "";
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        label: `${locality}, Hyderabad`,
        address: top.formatted_address || `${locality}, Hyderabad - ${pincode}`,
        locality,
        pincode,
        source: "google_maps",
      };
    }
  } catch (error) {
    // Google Maps unavailable/billing error: fall through to Nominatim & Local database
  }

  // 2. OpenStreetMap Nominatim reverse geocode (hyperlocal Indian address details)
  try {
    const nominatimData = await new Promise((resolve) => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`;
      const req = https.get(
        url,
        { headers: { "User-Agent": "NearBuy-Hyperlocal-Platform/1.0" } },
        (res) => {
          let buf = "";
          res.on("data", (c) => (buf += c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(buf));
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on("error", () => resolve(null));
      req.setTimeout(4000, () => {
        req.destroy();
        resolve(null);
      });
    });

    if (nominatimData?.address) {
      const a = nominatimData.address;
      const locality =
        a.suburb ||
        a.neighbourhood ||
        a.residential ||
        a.quarter ||
        a.road ||
        a.village ||
        a.town ||
        a.city_district ||
        "Hyderabad";
      const city = a.city || a.state_district || "Hyderabad";
      const pincode = a.postcode || "";
      const primaryLoc = a.road ? `${a.road}, ${locality}` : locality;
      const baseAddress = `${primaryLoc}, ${city}`;
      const formattedAddress = pincode ? `${baseAddress} - ${pincode}` : baseAddress;

      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        label: `${locality}, ${city}`,
        address: formattedAddress || nominatimData.display_name,
        locality,
        pincode,
        source: "nominatim",
      };
    }
  } catch (error) {
    // Nominatim failed; fall through to local dataset
  }

  // 3. Fallback to closest curated Hyderabad locality
  const fallback = findClosestLocality(coords.latitude, coords.longitude);
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    label: fallback.label,
    address: fallback.address,
    locality: fallback.label.split(",")[0],
    pincode: fallback.pincode,
    source: "curated_fallback",
  };
};

module.exports = {
  validateCoordinates,
  calculateDistanceAndDuration,
  calculateRoute,
  getCaptainToShopRoute,
  getCaptainToCustomerRoute,
  getShopToCustomerRoute,
  reverseGeocodeLocation,
  findClosestLocality,
  HYDERABAD_FALLBACK_LOCALITIES,
  calculateHaversineDistanceKm: (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};
