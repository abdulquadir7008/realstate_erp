import { currentOrgId, currentUserId } from '../../prisma/tenant-context';
import { errors } from '../api-error';

/** Returns the current tenant id or throws when missing (tenant-only endpoints). */
export function requireOrgId(): string {
  const id = currentOrgId();
  if (!id) throw errors.internal('Missing tenant context');
  return id;
}

/** Returns the current authenticated user id (may be null for system operations). */
export function actorId(): string | null {
  return currentUserId();
}
