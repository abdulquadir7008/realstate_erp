import { PERMISSIONS_KEY, SAAS_KEY } from '../../common/decorators';
import { SaasAdminController } from './saas-admin.controller';

describe('SaasAdminController authorization metadata', () => {
  it('requires SaaS platform scope', () => {
    expect(Reflect.getMetadata(SAAS_KEY, SaasAdminController)).toBe(true);
  });

  it('requires the organization:read permission', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, SaasAdminController)).toEqual(['organization:read']);
  });
});
