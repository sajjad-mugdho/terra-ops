export type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID";

const defaultMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Please log in again",
  FORBIDDEN: "Not allowed",
  NOT_FOUND: "Not found",
  CONFLICT: "Something changed. Please try again",
  INVALID: "Please check your input",
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string = defaultMessages[code]) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
