import { PERMISSIONS, roleHasPermission } from '@re/shared';

describe('permission model', () => {
  it('generates unique module:action codes', () => {
    const codes = PERMISSIONS.map((permission) => permission.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('honours wildcard grants', () => {
    expect(roleHasPermission(['*'], 'project:read')).toBe(true);
  });

  it('honours module:manage grants', () => {
    expect(roleHasPermission(['booking:manage'], 'booking:approve')).toBe(true);
  });

  it('rejects permissions that were not granted', () => {
    expect(roleHasPermission(['project:read'], 'project:delete')).toBe(false);
  });
});
