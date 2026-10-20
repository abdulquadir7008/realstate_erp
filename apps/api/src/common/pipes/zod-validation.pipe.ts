import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodTypeAny, z } from 'zod';
import { errors } from '../api-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw errors.validation(
        result.error.issues.map((i) => ({ path: i.path.join('.') || 'root', message: i.message, code: i.code })),
      );
    }
    return result.data;
  }
}

export function zodBody<T extends ZodTypeAny>(schema: T) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const existing = Reflect.getMetadata('pipes', target, propertyKey) || [];
    Reflect.defineMetadata('pipes', [new ZodValidationPipe(schema), ...existing], target, propertyKey);
  };
}

export function parseQuery<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw errors.validation(
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code })),
    );
  }
  return result.data as z.infer<T>;
}
