export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  /** Safe, user-facing structured data that is always included in responses. */
  publicDetails?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }

  withPublicDetails(publicDetails: unknown): this {
    this.publicDetails = publicDetails;
    return this;
  }
}
