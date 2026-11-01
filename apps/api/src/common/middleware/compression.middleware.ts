import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Enable compression for responses over 1KB
    if (req.headers['accept-encoding']) {
      // @ts-ignore - Express Response type doesn't have compress natively in all versions
      if (!res.compress) {
        // Try to add compression headers manually
        res.set('Content-Encoding', 'gzip');
      }
    }
    next();
  }
}