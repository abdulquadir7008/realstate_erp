import { Paginated } from '@re/shared';

export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit };
}

export function pageOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}
