import { uniq, filterMap, mergeObjects } from '../util'

describe('util', () => {
  describe('uniq', () => {
    it('returns unique items', () => {
      expect(uniq([1, 2, 2, 1, 3, 4, 3, 2, 5])).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('filterMap', () => {
    it('filters out false values', () => {
      expect(filterMap(
        [1, 2, 3, 4],
        (item) => item % 2 === 0 ? false : item + 1
      )).toEqual([2, 4])
    })
  })

  describe('mergeObjects', () => {
    it('merges an array of objects', () => {
      expect(mergeObjects(
        [{ a: 1 }, { b: 2 }, { a: 3 }, { c: 4 }]
      )).toEqual({ a: 3, b: 2, c: 4 })
    })
  })
})