export function deduplicateCategories(categories = []) {
  const list = Array.isArray(categories) ? categories : []
  const unique = Array.from(new Set(list.filter(Boolean)))
  const nonAll = unique.filter((c) => c !== 'All')
  return ['All', ...nonAll]
}
