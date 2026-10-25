import { describe, it, expect } from 'vitest';
import { apiClient } from './api-client';

describe('API Client', () => {
  it('should have correct default base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1');
  });

  it('should have json headers by default', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });
});
