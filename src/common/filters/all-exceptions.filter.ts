import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Statuses at or above this are ours to log, not the caller mistake. */
const SERVER_ERROR_THRESHOLD = 500;

interface NestErrorBody {
  message?: string | string[];
  error?: string;
}

/**
 * Normalises every thrown error into the `{ message, success: false }` envelope the
 * existing client reads. `status` is mirrored alongside `success` because the old
 * `/auth/register` endpoint reported failures under that key.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);

    if (status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({ message, success: false, status: false });
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return body;
      }

      const { message } = body as NestErrorBody;

      // `ValidationPipe` reports one message per failed constraint.
      if (Array.isArray(message)) {
        return message.join(', ');
      }

      return message ?? exception.message;
    }

    return 'Internal Server Error';
  }
}
