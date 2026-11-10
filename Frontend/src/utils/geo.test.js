import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidCoordinate,
  haversineDistanceKm,
  formatDistance,
  formatDuration,
  getNearestLocality,
  getNearestLocalityLabel,
  HYDERABAD_LOCALITIES,
} from './geo.js'

test('isValidCoordinate validates coordinate ranges correctly', () => {
  assert.equal(isValidCoordinate(17.3824, 78.4418), true)
  assert.equal(isValidCoordinate(0, 0), true)
  assert.equal(isValidCoordinate(-90, 180), true)
  assert.equal(isValidCoordinate(91, 78.4418), false)
  assert.equal(isValidCoordinate(17.3824, 181), false)
  assert.equal(isValidCoordinate(null, 78.4418), false)
  assert.equal(isValidCoordinate(undefined, undefined), false)
  assert.equal(isValidCoordinate('abc', 'xyz'), false)
})

test('haversineDistanceKm computes accurate distance between Erragadda and Murad Nagar', () => {
  // Erragadda: 17.4544, 78.4357
  // Murad Nagar: 17.3824, 78.4418
  const distance = haversineDistanceKm(17.4544, 78.4357, 17.3824, 78.4418)
  assert.ok(distance !== null)
  // Distance should be approximately 8.0 to 8.6 km
  assert.ok(distance >= 7.8 && distance <= 8.8, `Expected ~8.1 km, got ${distance}`)
})

test('formatDistance formats km cleanly', () => {
  assert.equal(formatDistance(1.234), '1.2 km')
  assert.equal(formatDistance(0.55), '0.6 km')
  assert.equal(formatDistance(null, 'Unavailable'), 'Unavailable')
  assert.equal(formatDistance({ kilometers: 2.3, meters: 2300 }), '2.3 km')
  assert.equal(formatDistance({ meters: 1500 }), '1.5 km')
  assert.equal(formatDistance({ text: '3.4 km' }), '3.4 km')
  assert.equal(formatDistance('1.4 km'), '1.4 km')
})

test('formatDuration formats minutes and seconds cleanly', () => {
  assert.equal(formatDuration(5), '5 mins')
  assert.equal(formatDuration({ minutes: 6.9, seconds: 414 }), '7 mins')
  assert.equal(formatDuration({ seconds: 120 }), '2 mins')
  assert.equal(formatDuration({ text: '10 mins' }), '10 mins')
  assert.equal(formatDuration(null, '5 mins'), '5 mins')
  assert.equal(formatDuration('5 mins'), '5 mins')
})

test('getNearestLocality resolves Erragadda accurately for Erragadda coordinates', () => {
  const locality = getNearestLocality(17.4544, 78.4357)
  assert.ok(locality)
  assert.equal(locality.id, 'erragadda')
  assert.equal(locality.pincode, '500018')
  assert.ok(locality.address.includes('Erragadda'))
})

test('getNearestLocality resolves Murad Nagar accurately for Murad Nagar coordinates', () => {
  const locality = getNearestLocality(17.3824, 78.4418)
  assert.ok(locality)
  assert.equal(locality.id, 'murad-nagar')
  assert.equal(locality.pincode, '500028')
})

test('getNearestLocalityLabel returns clean locality name', () => {
  const label = getNearestLocalityLabel(17.3824, 78.4418)
  assert.equal(label, 'Murad Nagar, Hyderabad')
})

test('HYDERABAD_LOCALITIES has valid data for all entries', () => {
  assert.ok(HYDERABAD_LOCALITIES.length >= 20)
  for (const loc of HYDERABAD_LOCALITIES) {
    assert.ok(loc.id, 'Locality should have id')
    assert.ok(loc.label, 'Locality should have label')
    assert.ok(loc.address, 'Locality should have address')
    assert.ok(isValidCoordinate(loc.latitude, loc.longitude), `Invalid coords for ${loc.label}`)
    assert.ok(loc.pincode && /^\d{6}$/.test(loc.pincode), `Invalid pincode for ${loc.label}`)
  }
})
