import { describe, it, expect, beforeEach } from 'vitest';
import '@/lib/prisma'; // ensure prisma mock is loaded
import '../mocks/prisma';
import { prismaMock } from '../mocks/prisma';
import { GET } from '@/app/api/invite/validate/route';
import { NextRequest } from 'next/server';

function createRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/invite/validate');
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/invite/validate', () => {
  beforeEach(() => {
    prismaMock.inviteToken.findUnique.mockReset();
  });

  it('returns { valid: false } when no token provided', async () => {
    const response = await GET(createRequest());

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('No token provided');
  });

  it('returns { valid: false } for invalid token', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue(null);

    const response = await GET(createRequest({ token: 'bad-token' }));

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invalid invite token');
  });

  it('returns { valid: false } for already used token', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'used-token',
      email: 'test@example.com',
      role: 'member',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await GET(createRequest({ token: 'used-token' }));

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invite already used');
  });

  it('returns { valid: false } for expired token', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'expired-token',
      email: 'test@example.com',
      role: 'member',
      usedAt: null,
      expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await GET(createRequest({ token: 'expired-token' }));

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe('Invite expired');
  });

  it('returns { valid: true } with email and role for valid token', async () => {
    prismaMock.inviteToken.findUnique.mockResolvedValue({
      id: '1',
      token: 'valid-token',
      email: 'test@example.com',
      role: 'member',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000), // expires tomorrow
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    const response = await GET(createRequest({ token: 'valid-token' }));

    const body = await response.json();
    expect(body.valid).toBe(true);
    expect(body.email).toBe('test@example.com');
    expect(body.role).toBe('member');
  });
});
