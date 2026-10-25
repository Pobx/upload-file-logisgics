import { describe, it, expect } from 'vitest';
import { apiClient, setAuthToken, getUserInfo } from './api-client';

describe('API Client', () => {
  it('should have correct default base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1');
  });

  it('should have json headers by default', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should decode base64url jwt tokens properly without failing on url-safe characters', () => {
    // Generate a payload that produces Base64URL characters with hyphen/underscore
    // Binary bytes that encode to characters with + and /
    const payloadJson = JSON.stringify({ preferred_username: 'test_user', roles: ['admin'], sub: 'sub-with-symbols-??' });
    const standardBase64 = Buffer.from(payloadJson).toString('base64');
    const base64url = standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    setAuthToken(`header.${base64url}.signature`);
    const info = getUserInfo();
    expect(info).not.toBeNull();
    expect(info?.username).toBe('test_user');
    expect(info?.roles).toContain('admin');
  });
});
