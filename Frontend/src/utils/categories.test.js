import assert from 'node:assert/strict'
import test from 'node:test'
import { deduplicateCategories } from './categories.js'

test('deduplicateCategories removes duplicate All and preserves unique category items', () => {
  const input = ['All', 'Snacks', 'Beverages', 'Snacks', 'All', 'Dairy']
  const result = deduplicateCategories(input)

  assert.deepEqual(result, ['All', 'Snacks', 'Beverages', 'Dairy'])
  // Ensure 'All' is at index 0 and appears exactly once
  assert.equal(result.filter((c) => c === 'All').length, 1)
  assert.equal(result[0], 'All')
})

test('deduplicateCategories handles array without All and adds All at front', () => {
  const input = ['Snacks', 'Beverages']
  const result = deduplicateCategories(input)

  assert.deepEqual(result, ['All', 'Snacks', 'Beverages'])
})

test('deduplicateCategories filters out empty and falsy entries', () => {
  const input = ['All', '', null, undefined, 'Staples']
  const result = deduplicateCategories(input)

  assert.deepEqual(result, ['All', 'Staples'])
})
