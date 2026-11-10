/**
 * NearBuy Locality Registry and Coverage Matching Service
 *
 * Provides:
 * 1. Verified locality registry for Hyderabad with sublocalities, aliases, and geographic coordinates.
 * 2. Locality search and resolution engine (safe against substring misclassifications).
 * 3. Consistent, deterministic Order-to-Captain coverage matching rule:
 *    - Destination delivery locality or coordinates MUST fall within Captain's configured service areas.
 *    - If coordinates exist, checks distance to any configured service area center (default 5.0 km radius).
 *    - Captains without configured service areas are not offered orders until they select coverage.
 */

const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
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

const HYDERABAD_LOCALITY_REGISTRY = [
  {
    id: "mehdipatnam",
    name: "Mehdipatnam",
    zone: "Southwest / Central",
    aliases: ["mehdipatnam", "rethi bowli", "gudimalkapur", "attapur border", "pillar 1"],
    sublocalities: [
      "Rythu Bazar",
      "Rethi Bowli",
      "Pillars 1 to 50",
      "Gudimalkapur",
      "Sarojini Eye Hospital Area",
      "Attapur Link",
    ],
    latitude: 17.3916,
    longitude: 78.4398,
    pincode: "500028",
  },
  {
    id: "murad-nagar",
    name: "Murad Nagar",
    zone: "Central / Old City West",
    aliases: ["murad nagar", "choti masjid", "zeba bagh", "syed ali guda", "dattatreya colony", "dattadari"],
    sublocalities: [
      "Near Choti Masjid",
      "Zeba Bagh",
      "Syed Ali Guda",
      "Murad Nagar Kaman",
      "Dattatreya Colony",
      "Alapathi Nagar",
      "Viswash Nagar",
    ],
    latitude: 17.3824,
    longitude: 78.4418,
    pincode: "500028",
  },
  {
    id: "asif-nagar",
    name: "Asif Nagar",
    zone: "Central / Old City West",
    aliases: ["asif nagar", "jhirra", "asifnagar", "mallepally road"],
    sublocalities: [
      "Main Road Corridor",
      "Jhirra",
      "Mallepally Border",
      "Asif Nagar Police Station Area",
      "Mehdipatnam Link Road",
    ],
    latitude: 17.3885,
    longitude: 78.451,
    pincode: "500028",
  },
  {
    id: "abids",
    name: "Abids",
    zone: "Central Hyderabad",
    aliases: ["abids", "gunfoundry", "boggulkunta", "tilak road", "chirag ali lane", "koti border"],
    sublocalities: [
      "Gunfoundry",
      "Taj Mahal Hotel Circle",
      "Boggulkunta",
      "Tilak Road",
      "Chirag Ali Lane",
      "GPO Circle",
    ],
    latitude: 17.3892,
    longitude: 78.4744,
    pincode: "500001",
  },
  {
    id: "nampally",
    name: "Nampally",
    zone: "Central Hyderabad",
    aliases: ["nampally", "station road nampally", "public gardens", "exhibition grounds", "bazar ghat", "ek minar"],
    sublocalities: [
      "Station Road",
      "Public Gardens",
      "Exhibition Grounds (Numaish)",
      "Bazar Ghat",
      "Ek Minar Masjid Area",
      "Red Hills Border",
    ],
    latitude: 17.3919,
    longitude: 78.4673,
    pincode: "500001",
  },
  {
    id: "masab-tank",
    name: "Masab Tank",
    zone: "Central / Banjara Foothills",
    aliases: ["masab tank", "nmdc", "chintal basti", "ac guards", "humayun nagar", "khaja mansion"],
    sublocalities: [
      "NMDC Corporate Office",
      "Chintal Basti",
      "Mahaveer Hospital Lane",
      "AC Guards",
      "Humayun Nagar",
      "Khaja Mansion Road",
    ],
    latitude: 17.4042,
    longitude: 78.4525,
    pincode: "500028",
  },
  {
    id: "tolichowki",
    name: "Tolichowki",
    zone: "West / Golconda Corridor",
    aliases: ["tolichowki", "paramount colony", "shaikpet", "seven tombs", "razaak colony"],
    sublocalities: [
      "Paramount Colony",
      "Shaikpet Nala",
      "Seven Tombs Road",
      "Razaak Colony",
      "Al-Hasnath Colony",
      "Aditya Nagar",
    ],
    latitude: 17.4014,
    longitude: 78.4118,
    pincode: "500008",
  },
  {
    id: "lakdikapul",
    name: "Lakdikapul",
    zone: "Central Hyderabad",
    aliases: ["lakdikapul", "saifabad", "red hills", "niloufer", "ravindra bharathi"],
    sublocalities: [
      "Saifabad",
      "Red Hills",
      "Ravindra Bharathi Area",
      "Niloufer Hospital Road",
      "Telephone Bhavan Road",
    ],
    latitude: 17.405,
    longitude: 78.465,
    pincode: "500004",
  },
  {
    id: "banjara-hills",
    name: "Banjara Hills",
    zone: "West Hyderabad",
    aliases: ["banjara hills", "road no 1", "road no 12", "care hospital banjara", "star hospital"],
    sublocalities: [
      "Road No. 1",
      "Road No. 10",
      "Road No. 12",
      "Taj Krishna Environs",
      "Care Hospital Corridor",
    ],
    latitude: 17.4156,
    longitude: 78.435,
    pincode: "500034",
  },
  {
    id: "jubilee-hills",
    name: "Jubilee Hills",
    zone: "West Hyderabad",
    aliases: ["jubilee hills", "road no 36", "road no 45", "checkpost jubilee"],
    sublocalities: [
      "Road No. 36",
      "Road No. 45",
      "Journalist Colony",
      "Jubilee Checkpost",
      "Peddamma Temple Area",
    ],
    latitude: 17.4319,
    longitude: 78.4073,
    pincode: "500033",
  },
  {
    id: "charminar",
    name: "Charminar",
    zone: "South / Old City",
    aliases: ["charminar", "laad bazaar", "madina", "ghansi bazaar", "gulzar houz", "patel market"],
    sublocalities: [
      "Laad Bazaar",
      "Madina Building",
      "Ghansi Bazaar",
      "Gulzar Houz",
      "High Court Corridor",
    ],
    latitude: 17.3616,
    longitude: 78.4747,
    pincode: "500002",
  },
  {
    id: "ameerpet",
    name: "Ameerpet",
    zone: "Northwest Hyderabad",
    aliases: ["ameerpet", "mytrivanam", "dharam karam", "sr nagar border"],
    sublocalities: [
      "Ameerpet Metro Interchange",
      "Mytrivanam",
      "Dharam Karan Road",
      "Elephant House Road",
    ],
    latitude: 17.4375,
    longitude: 78.4482,
    pincode: "500016",
  },
  {
    id: "erragadda",
    name: "Erragadda",
    zone: "Northwest Hyderabad",
    aliases: ["erragadda", "sultan bhag", "gokul theater erragadda", "sanath nagar border"],
    sublocalities: [
      "Sultan Bhag",
      "Gokul Theater Environs",
      "Sanath Nagar Industrial Link",
      "Rythu Bazar Erragadda",
    ],
    latitude: 17.4544,
    longitude: 78.4357,
    pincode: "500018",
  },
];

const normalizeText = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Returns all verified Hyderabad localities.
 */
function getAllLocalities() {
  return HYDERABAD_LOCALITY_REGISTRY;
}

/**
 * Search localities by query (matching id, name, zone, aliases, or sublocalities).
 */
function searchLocalities(query = "") {
  const q = normalizeText(query);
  if (!q) {
    return HYDERABAD_LOCALITY_REGISTRY;
  }

  return HYDERABAD_LOCALITY_REGISTRY.filter((loc) => {
    if (normalizeText(loc.name).includes(q)) return true;
    if (normalizeText(loc.zone).includes(q)) return true;
    if (loc.aliases.some((alias) => normalizeText(alias).includes(q) || q.includes(normalizeText(alias)))) {
      return true;
    }
    if (loc.sublocalities.some((sub) => normalizeText(sub).includes(q))) {
      return true;
    }
    return false;
  });
}

/**
 * Find locality by ID.
 */
function findLocalityById(localityId) {
  if (!localityId) return null;
  const targetId = String(localityId).trim().toLowerCase();
  return HYDERABAD_LOCALITY_REGISTRY.find((loc) => loc.id === targetId) || null;
}

/**
 * Resolves a text address string into the best matched verified locality.
 * Uses exact whole-word/phrase boundaries to prevent false positive substring matches.
 */
function resolveLocalityFromAddress(addressText) {
  if (!addressText || typeof addressText !== "string") return null;
  const normalized = normalizeText(addressText);

  // 1. Try aliases and names
  for (const loc of HYDERABAD_LOCALITY_REGISTRY) {
    // Check main name
    const locNameNorm = normalizeText(loc.name);
    const regex = new RegExp(`(^|\\s)${locNameNorm}(\\s|$)`, "i");
    if (regex.test(normalized)) {
      return loc;
    }

    // Check aliases
    for (const alias of loc.aliases) {
      const aliasNorm = normalizeText(alias);
      const aliasRegex = new RegExp(`(^|\\s)${aliasNorm}(\\s|$)`, "i");
      if (aliasRegex.test(normalized)) {
        return loc;
      }
    }

    // Check sublocalities
    for (const sub of loc.sublocalities) {
      const subNorm = normalizeText(sub);
      if (normalized.includes(subNorm)) {
        return loc;
      }
    }
  }

  return null;
}

/**
 * Finds the closest verified locality by geographic coordinates.
 */
function findLocalityByCoordinates(latitude, longitude, maxDistanceKm = 8.0) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  let closest = null;
  let minDistance = Infinity;

  for (const loc of HYDERABAD_LOCALITY_REGISTRY) {
    const dist = calculateHaversineDistanceKm(lat, lng, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  if (closest && minDistance <= maxDistanceKm) {
    return { ...closest, distanceKm: Number(minDistance.toFixed(2)) };
  }

  return null;
}

/**
 * Resolves an order's pickup and delivery localities using address text & coordinates.
 */
function resolveOrderLocalities(order) {
  if (!order) return { pickupLocality: null, deliveryLocality: null };

  // 1. Pickup locality (from shop address or coordinates)
  let pickupLocality = null;
  const shopObj = order.shop;

  if (shopObj && typeof shopObj === "object") {
    if (shopObj.locality) {
      pickupLocality = resolveLocalityFromAddress(shopObj.locality);
    }
    if (!pickupLocality && shopObj.address) {
      pickupLocality = resolveLocalityFromAddress(shopObj.address);
    }
    if (!pickupLocality && shopObj.location?.latitude && shopObj.location?.longitude) {
      pickupLocality = findLocalityByCoordinates(shopObj.location.latitude, shopObj.location.longitude);
    }
  }

  // 2. Delivery locality (from deliveryAddress or deliveryLocation)
  let deliveryLocality = null;
  if (order.deliveryAddress) {
    deliveryLocality = resolveLocalityFromAddress(order.deliveryAddress);
  }
  if (!deliveryLocality && order.deliveryLocation?.latitude && order.deliveryLocation?.longitude) {
    deliveryLocality = findLocalityByCoordinates(
      order.deliveryLocation.latitude,
      order.deliveryLocation.longitude
    );
  }

  return { pickupLocality, deliveryLocality };
}

/**
 * DETERMINISTIC COVERAGE RULE:
 * An order is eligible for a Captain if and only if:
 * 1. The Captain has at least one configured service area.
 * 2. The order's delivery destination locality matches one of the Captain's configured service area IDs, OR
 *    if destination coordinates are available, the distance between the customer delivery location
 *    and any of the Captain's configured service area centers is within maxRadiusKm (default 5.0 km).
 * 3. An order whose destination falls outside all configured areas of the Captain is strictly excluded.
 */
function isOrderCoveredByCaptain(order, captain, maxRadiusKm = 5.0) {
  if (!captain || !Array.isArray(captain.serviceAreas) || captain.serviceAreas.length === 0) {
    // A Captain with no configured service areas receives 0 orders until configuring them
    return false;
  }

  const { deliveryLocality } = resolveOrderLocalities(order);
  const captainAreaIds = new Set(captain.serviceAreas.map((sa) => String(sa.localityId).trim().toLowerCase()));

  // 1. Exact or recognized locality match
  if (deliveryLocality && captainAreaIds.has(deliveryLocality.id)) {
    return true;
  }

  // 2. Sublocality / alias match in Captain's configured service areas
  if (order.deliveryAddress) {
    const normDelivery = normalizeText(order.deliveryAddress);
    for (const sa of captain.serviceAreas) {
      const regLoc = findLocalityById(sa.localityId);
      if (regLoc) {
        if (regLoc.aliases.some((a) => normDelivery.includes(normalizeText(a)))) return true;
        if (regLoc.sublocalities.some((s) => normDelivery.includes(normalizeText(s)))) return true;
      }
    }
  }

  // 3. Coordinate-based radius match to any configured service area center
  const destLat = order.deliveryLocation?.latitude;
  const destLng = order.deliveryLocation?.longitude;

  if (Number.isFinite(Number(destLat)) && Number.isFinite(Number(destLng))) {
    for (const sa of captain.serviceAreas) {
      let areaLat = sa.latitude;
      let areaLng = sa.longitude;

      if (!Number.isFinite(Number(areaLat)) || !Number.isFinite(Number(areaLng))) {
        const regLoc = findLocalityById(sa.localityId);
        if (regLoc) {
          areaLat = regLoc.latitude;
          areaLng = regLoc.longitude;
        }
      }

      if (Number.isFinite(Number(areaLat)) && Number.isFinite(Number(areaLng))) {
        const dist = calculateHaversineDistanceKm(destLat, destLng, areaLat, areaLng);
        if (dist <= maxRadiusKm) {
          return true;
        }
      }
    }
  }

  return false;
}

module.exports = {
  HYDERABAD_LOCALITY_REGISTRY,
  getAllLocalities,
  searchLocalities,
  findLocalityById,
  resolveLocalityFromAddress,
  findLocalityByCoordinates,
  resolveOrderLocalities,
  isOrderCoveredByCaptain,
  calculateHaversineDistanceKm,
};
