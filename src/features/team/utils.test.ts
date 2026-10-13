import { describe, expect, it } from 'vitest'
import type { ExecutorResponse, TeamMemberResponse } from '@/api/types'
import { ExecutorAvailabilityValues } from '@/api/types'
import {
  EMPTY_EXECUTOR,
  SETTABLE_AVAILABILITY,
  createExecutorBody,
  executorSearchTerm,
  draftFromExecutor,
  executorProfileBody,
  fieldForError,
  hasErrors,
  isSettableAvailability,
  normalizePhone,
  ownerUserIds,
  parseMaxJobs,
  phoneChanged,
  profileChanged,
  resolveTab,
  sameSet,
  selectedOutside,
  skillOptions,
  supervisorBody,
  supervisorsOf,
  validateExecutor,
  validatePerson,
} from './utils'

const executor: ExecutorResponse = {
  id: 'e1',
  userId: 'u1',
  fullName: 'سالم',
  username: '+966501234567',
  phone: '+966501234567',
  email: null,
  specialization: 'تكييف',
  availability: 'Available',
  maxConcurrentJobs: 3,
  activeJobs: 1,
  capabilities: [{ id: 'c1', code: 'ac', nameAr: 'تكييف', nameEn: 'AC' }],
  averageRating: 4.5,
  ratingsCount: 2,
  completedItemsCount: 7,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const member = (over: Partial<TeamMemberResponse>): TeamMemberResponse => ({
  id: 'm',
  userId: 'u',
  fullName: 'x',
  username: 'x',
  phone: null,
  email: null,
  role: 'Executor',
  isActive: true,
  joinedAt: '2026-01-01T00:00:00Z',
  executorId: null,
  ...over,
})

describe('availability', () => {
  it('never offers Busy, which the server sets from load', () => {
    expect(SETTABLE_AVAILABILITY).toEqual(['Available', 'Offline', 'OnLeave'])
    expect(isSettableAvailability('Busy')).toBe(false)
    expect(ExecutorAvailabilityValues.filter(isSettableAvailability)).toEqual(['Available', 'Offline', 'OnLeave'])
    expect(isSettableAvailability(null)).toBe(false)
  })
})

describe('phone normalization', () => {
  it.each([
    ['0501234567', '+966501234567'],
    ['501234567', '+966501234567'],
    ['+966 50 123 4567', '+966501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '+966501234567'],
  ])('%s → %s', (input, out) => {
    expect(normalizePhone(input)).toBe(out)
  })

  it('rejects non-mobile numbers', () => {
    expect(normalizePhone('0112345678')).toBeNull()
    expect(normalizePhone('50123')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })

  it('submits the stored form even when the draft holds 05…', () => {
    expect(supervisorBody({ fullName: ' علي ', phone: '0551112222', email: '' })).toEqual({ fullName: 'علي', phone: '+966551112222', email: null })
  })
})

describe('executor search', () => {
  it('searches phones by their local digits, other text as typed', () => {
    expect(executorSearchTerm('0501234')).toBe('501234')
    expect(executorSearchTerm('+966 50 123 4567')).toBe('501234567')
    expect(executorSearchTerm(' سالم ')).toBe('سالم')
    expect(executorSearchTerm('   ')).toBeUndefined()
  })
})

describe('validation', () => {
  it('requires name and a Saudi mobile', () => {
    expect(validatePerson({ fullName: ' ', phone: '', email: '' })).toEqual({ fullName: 'required', phone: 'required' })
    expect(validatePerson({ fullName: 'a', phone: '4123', email: 'nope' })).toEqual({ phone: 'phone', email: 'email' })
    expect(hasErrors(validatePerson({ fullName: 'a', phone: '501234567', email: 'a@b.co' }))).toBe(false)
  })

  it('bounds max concurrent jobs to 1..50 whole numbers', () => {
    expect(parseMaxJobs('1')).toBe(1)
    expect(parseMaxJobs('50')).toBe(50)
    expect(parseMaxJobs('0')).toBeNull()
    expect(parseMaxJobs('51')).toBeNull()
    expect(parseMaxJobs('2.5')).toBeNull()
    expect(parseMaxJobs('')).toBeNull()
    expect(validateExecutor({ ...EMPTY_EXECUTOR, fullName: 'a', phone: '501234567', maxJobs: '99' })).toEqual({ maxJobs: 'range' })
  })
})

describe('executor bodies', () => {
  it('builds the create body with trimmed optionals and unique skills', () => {
    const body = createExecutorBody({ fullName: 'a', phone: '0501234567', email: ' ', specialization: '', maxJobs: '2', capabilityIds: ['c1', 'c1', 'c2'] })
    expect(body).toEqual({ fullName: 'a', phone: '+966501234567', email: null, specialization: null, maxConcurrentJobs: 2, capabilityIds: ['c1', 'c2'] })
  })

  it('round-trips an executor without counting as a change', () => {
    const draft = draftFromExecutor(executor)
    expect(draft.phone).toBe('501234567')
    expect(profileChanged(executor, executorProfileBody(draft))).toBe(false)
    expect(phoneChanged(executor, draft.phone)).toBe(false)
  })

  it('flags a phone change (the login) and other profile changes', () => {
    expect(phoneChanged(executor, '509999999')).toBe(true)
    expect(phoneChanged(executor, '50')).toBe(false)
    expect(phoneChanged({ phone: '0501234567' }, '501234567')).toBe(false)
    const draft = { ...draftFromExecutor(executor), maxJobs: '4' }
    expect(profileChanged(executor, executorProfileBody(draft))).toBe(true)
  })
})

describe('skills', () => {
  const org = [
    { id: 'c1', code: null, nameAr: 'أ', nameEn: 'A' },
    { id: 'c2', code: null, nameAr: 'ب', nameEn: 'B' },
  ]

  it('lists organization capabilities, then held skills outside them', () => {
    const options = skillOptions(org, [{ id: 'c9', code: null, nameAr: 'ز', nameEn: 'Z' }, org[0]!])
    expect(options.map((o) => [o.id, !!o.outside])).toEqual([
      ['c1', false],
      ['c2', false],
      ['c9', true],
    ])
    expect(selectedOutside(options, ['c1'])).toBe(false)
    expect(selectedOutside(options, ['c9'])).toBe(true)
  })

  it('compares selections as sets', () => {
    expect(sameSet(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameSet(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('server errors → fields', () => {
  it('routes known codes to their field', () => {
    expect(fieldForError('PhoneAlreadyRegistered')).toBe('phone')
    expect(fieldForError('PhoneNumberInvalid')).toBe('phone')
    expect(fieldForError('FullNameRequired')).toBe('fullName')
    expect(fieldForError('MaxConcurrentJobsOutOfRange')).toBe('maxJobs')
    expect(fieldForError('ExecutorCapabilityNotInOrganization')).toBe('capabilityIds')
    expect(fieldForError('CannotDeactivateOwner')).toBeNull()
    expect(fieldForError(null)).toBeNull()
  })
})

describe('tabs and members', () => {
  it('hides the supervisors tab from supervisors', () => {
    expect(resolveTab('supervisors', true)).toBe('supervisors')
    expect(resolveTab('supervisors', false)).toBe('technicians')
    expect(resolveTab('members', false)).toBe('members')
    expect(resolveTab('bogus', true)).toBe('technicians')
  })

  it('finds owners and supervisors', () => {
    const list = [member({ id: '1', userId: 'o', role: 'Owner' }), member({ id: '2', role: 'Supervisor' }), member({ id: '3' })]
    expect([...ownerUserIds(list)]).toEqual(['o'])
    expect(supervisorsOf(list).map((m) => m.id)).toEqual(['2'])
    expect(supervisorsOf(undefined)).toEqual([])
  })
})
