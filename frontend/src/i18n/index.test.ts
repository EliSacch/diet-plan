import { beforeEach, describe, expect, it } from 'vitest'
import { en } from './locales/en'
import { it as italian } from './locales/it'
import { messageForProblem, setLocale } from './index'

describe('messageForProblem', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('returns the catalog message for a known code', () => {
    expect(messageForProblem({ code: 'NOT_FOUND', detail: 'Meal not found' })).toBe(
      en.errors.NOT_FOUND,
    )
  })

  it('returns detail when the code is not in the catalog', () => {
    expect(
      messageForProblem({ code: 'MEAL_NOT_FOUND', detail: 'Meal 42 not found' }),
    ).toBe('Meal 42 not found')
  })

  it('returns the unknown message when code and detail are missing', () => {
    expect(messageForProblem({})).toBe(en.errors.UNKNOWN)
  })

  it('returns the Italian message after setLocale', () => {
    setLocale('it')
    expect(messageForProblem({ code: 'NOT_FOUND' })).toBe(italian.errors.NOT_FOUND)
    setLocale('en')
  })
})
