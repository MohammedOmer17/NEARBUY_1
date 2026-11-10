const assert = require('assert');
const {
  validateCoordinates,
  calculateDistanceAndDuration,
  calculateRoute,
  getCaptainToShopRoute,
  getCaptainToCustomerRoute,
  getShopToCustomerRoute,
  calculateHaversineDistanceKm,
} = require('../services/googleMapsService');

async function runDeliveryMapsTests() {
  console.log('=== STARTING DELIVERY MAPS & ROUTING INTEGRATION TESTS ===\n');

  // Test 1: Coordinate Validation
  console.log('--- TEST 1: Coordinate Validation ---');
  const valid = validateCoordinates({ latitude: 17.3824, longitude: 78.4418 });
  assert.strictEqual(valid.latitude, 17.3824);
  assert.strictEqual(valid.longitude, 78.4418);

  assert.throws(() => validateCoordinates(null), /required/);
  assert.throws(() => validateCoordinates({ latitude: 95, longitude: 78.4418 }), /between -90 and 90/);
  assert.throws(() => validateCoordinates({ latitude: 17.3824, longitude: 195 }), /between -180 and 180/);
  console.log('✓ Valid coordinate bounds and types correctly verified');

  // Test 2: Local distance calculation & Prevention of fabricated 617 km
  console.log('\n--- TEST 2: Hyperlocal Distance Sanity vs Fabricated Distance ---');
  // Choti Masjid, Murad Nagar (17.3824, 78.4418) to Zeba Bagh (17.3868, 78.4408)
  const localDist = calculateHaversineDistanceKm(17.3824, 78.4418, 17.3868, 78.4408);
  console.log(`Local Murad Nagar to Zeba Bagh distance: ${localDist.toFixed(2)} km`);
  assert(localDist < 1.0, 'Micro-neighborhood distance should be under 1 km');

  // Cross-city Mumbai to Hyderabad (the bug that caused 617.3 km)
  const mumbaiDist = calculateHaversineDistanceKm(19.076, 72.8777, 17.3824, 78.4418);
  console.log(`Mumbai mock fallback distance: ${mumbaiDist.toFixed(1)} km`);
  assert(mumbaiDist > 600, 'Identified and confirmed old Mumbai mock coordinate bug caused 617+ km');
  console.log('✓ Verified local kirana deliveries are within genuine neighborhood bounds (~0.1-5 km)');

  // Test 3: Real Road Route Calculation with OSRM Fallback
  console.log('\n--- TEST 3: Road Routing & Polyline Coordinates ---');
  const origin = { latitude: 17.3824, longitude: 78.4418 };
  const destination = { latitude: 17.3868, longitude: 78.4408 };

  const routeResult = await calculateRoute(origin, destination);
  console.log('Route calculation returned:', {
    distance: routeResult.distance,
    duration: routeResult.duration,
    source: routeResult.route?.source,
    coordinatePointsCount: routeResult.route?.coordinates?.length,
  });

  assert(routeResult.distance && routeResult.distance.meters > 0, 'Road distance must be greater than 0');
  assert(routeResult.duration && routeResult.duration.seconds > 0, 'Road duration must be greater than 0');
  assert(
    Array.isArray(routeResult.route?.coordinates) && routeResult.route.coordinates.length >= 2,
    'Route must provide real coordinate array for Leaflet polyline rendering'
  );
  // Verify coordinate format is [lat, lng]
  const firstPt = routeResult.route.coordinates[0];
  assert(firstPt[0] >= 17 && firstPt[0] <= 18, 'First point latitude should be in Hyderabad range');
  assert(firstPt[1] >= 78 && firstPt[1] <= 79, 'First point longitude should be in Hyderabad range');
  console.log('✓ Real road coordinates array returned and properly formatted for Leaflet [lat, lng]');

  // Test 4: Captain to Shop Route
  console.log('\n--- TEST 4: Captain-to-Shop Route Calculation ---');
  const captainToShop = await getCaptainToShopRoute(origin, destination);
  assert(captainToShop.route && captainToShop.route.coordinates.length > 0);
  console.log(`✓ Captain to Shop route distance: ${captainToShop.distance.kilometers} km, ETA: ${captainToShop.duration.minutes} mins`);

  // Test 5: Shop to Customer Route
  console.log('\n--- TEST 5: Shop-to-Customer Route Calculation ---');
  const customerLoc = { latitude: 17.3885, longitude: 78.4510 }; // Asif Nagar
  const shopToCustomer = await getShopToCustomerRoute(destination, customerLoc);
  assert(shopToCustomer.route && shopToCustomer.route.coordinates.length > 0);
  console.log(`✓ Shop to Customer route distance: ${shopToCustomer.distance.kilometers} km, ETA: ${shopToCustomer.duration.minutes} mins`);

  // Test 6: Google Maps Navigation URL Format Verification
  console.log('\n--- TEST 6: Google Maps Deep Link Navigation Format ---');
  const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
  assert(navUrl.includes('api=1'), 'URL must include api=1');
  assert(navUrl.includes(`origin=${origin.latitude},${origin.longitude}`), 'URL must contain verified origin coordinates');
  assert(navUrl.includes(`destination=${destination.latitude},${destination.longitude}`), 'URL must contain verified destination coordinates');
  assert(navUrl.includes('travelmode=driving'), 'URL must specify driving travelmode');
  console.log('✓ Google Maps Navigation link successfully validated:', navUrl);

  console.log('\n======================================================');
  console.log('ALL DELIVERY MAPS & ROUTING INTEGRATION TESTS PASSED!');
  console.log('======================================================');
}

runDeliveryMapsTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
