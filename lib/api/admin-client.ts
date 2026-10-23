export interface AdminRequestFailure {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

interface AdminRequestSuccess<T> {
  success: true;
  data: T;
}

export class AdminRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      fields?: Record<string, string[]>;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "AdminRequestError";
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields;
  }
}

export interface AdminRequestOptions extends RequestInit {
  redirectOnUnauthorized?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFailure(value: unknown): AdminRequestFailure["error"] | null {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) {
    return null;
  }
  const code = value.error.code;
  const message = value.error.message;
  if (typeof code !== "string" || typeof message !== "string") return null;

  const fields = value.error.fields;
  return {
    code,
    message,
    ...(isRecord(fields)
      ? {
          fields: Object.fromEntries(
            Object.entries(fields).filter(
              (entry): entry is [string, string[]] =>
                Array.isArray(entry[1]) &&
                entry[1].every((item) => typeof item === "string"),
            ),
          ),
        }
      : {}),
  };
}

function parseSuccess<T>(value: unknown): AdminRequestSuccess<T> | null {
  if (!isRecord(value) || value.success !== true || !("data" in value)) {
    return null;
  }
  return value as unknown as AdminRequestSuccess<T>;
}

function fallbackMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested record was not found.";
  if (status === 409) return "A record with these details already exists.";
  if (status === 422) return "The submitted data is not valid.";
  if (status >= 500) return "The server could not complete the request.";
  return "The request could not be completed.";
}

export function adminLoginHref(currentPath: string): string {
  const safePath =
    currentPath.startsWith("/admin") && !currentPath.startsWith("//")
      ? currentPath
      : "/admin";
  const params = new URLSearchParams({
    reason: "session-expired",
    next: safePath,
  });
  return `/admin/login?${params.toString()}`;
}

function redirectForExpiredSession(): void {
  if (typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  window.location.assign(adminLoginHref(currentPath));
}

export async function adminRequest<T>(
  input: RequestInfo | URL,
  options: AdminRequestOptions = {},
): Promise<T> {
  const { redirectOnUnauthorized = true, ...requestInit } = options;
  let response: Response;

  try {
    response = await fetch(input, requestInit);
  } catch (cause: unknown) {
    throw new AdminRequestError(
      "Unable to reach the server. Check your connection and try again.",
      { status: 0, code: "NETWORK_ERROR", cause },
    );
  }

  const body = await response.text();
  let payload: unknown = null;
  if (body) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      payload = null;
    }
  }

  const success = parseSuccess<T>(payload);
  if (response.ok && success) return success.data;

  const failure = parseFailure(payload);
  const error = new AdminRequestError(
    failure?.message ?? fallbackMessage(response.status),
    {
      status: response.status,
      code: failure?.code ?? (response.ok ? "INVALID_RESPONSE" : "HTTP_ERROR"),
      ...(failure?.fields ? { fields: failure.fields } : {}),
    },
  );

  if (response.status === 401 && redirectOnUnauthorized) {
    redirectForExpiredSession();
  }
  throw error;
}
