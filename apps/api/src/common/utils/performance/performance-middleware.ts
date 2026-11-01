import { Injectable, NestMiddleware, Logger, Request, Response } from '@nestjs/common';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startHr = process.hrtime.bigint();
    
    res.on('finish', () => {
      const endHr = process.hrtime.bigint();
      const durationMs = Number(endHr - startHr) / 1e6;
      const route = req.route ? req.route.path : req.path;
      const method = req.method;
      const statusCode = res.statusCode;
      const contentLength = res.get('Content-Length');
      
      this.logger.debug(
        `${method} ${route} ${statusCode} ${contentLength}ms ${durationMs.toFixed(2)}ms`
      );
    });
    
    next();
  }
}