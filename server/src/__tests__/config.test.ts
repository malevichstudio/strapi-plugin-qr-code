import { describe, it, expect } from 'vitest'
import config from '../config'

describe('QR Code Plugin Config', () => {
  it('should validate a valid configuration', () => {
    const validConfig = {
      contentTypes: [
        {
          uid: 'api::page.page',
          computeValue: (_uid: string, _status: 'draft' | 'published', _document: unknown) => 'https://example.com',
        },
      ],
    }

    expect(() => config.validator(validConfig)).not.toThrow()
  })

  it('should validate a configuration with populate option', () => {
    const validConfig = {
      contentTypes: [
        {
          uid: 'api::page.page',
          populate: ['field1', 'field2'],
          computeValue: (_uid: string, _status: 'draft' | 'published', _document: unknown) => 'https://example.com',
        },
      ],
    }

    expect(() => config.validator(validConfig)).not.toThrow()
  })

  it('should validate a configuration with wildcard populate', () => {
    const validConfig = {
      contentTypes: [
        {
          uid: 'api::page.page',
          populate: '*',
          computeValue: (_uid: string, _status: 'draft' | 'published', _document: unknown) => 'https://example.com',
        },
      ],
    }

    expect(() => config.validator(validConfig)).not.toThrow()
  })

  it('should reject invalid uid', () => {
    const invalidConfig = {
      contentTypes: [
        {
          uid: '',
          computeValue: (_uid: string, _status: 'draft' | 'published', _document: unknown) => 'https://example.com',
        },
      ],
    }

    expect(() => config.validator(invalidConfig)).toThrow()
  })

  it('should reject invalid populate option', () => {
    const invalidConfig = {
      contentTypes: [
        {
          uid: 'api::page.page',
          populate: [123], // Invalid type
          computeValue: (_uid: string, _status: 'draft' | 'published', _document: unknown) => 'https://example.com',
        },
      ],
    }

    expect(() => config.validator(invalidConfig)).toThrow()
  })

  it('should reject missing computeValue function', () => {
    const invalidConfig = {
      contentTypes: [
        {
          uid: 'api::page.page',
        },
      ],
    }

    expect(() => config.validator(invalidConfig)).toThrow()
  })
}) 
