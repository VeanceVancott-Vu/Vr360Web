import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export function apiSuccess<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<{ success: true; data: T }> {
  return NextResponse.json({ success: true, data }, init);
}

export function apiError(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>,
  init?: Omit<ResponseInit, "status">,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { ...init, status },
  );
}

export function zodFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (!Array.isArray(messages)) continue;
    const strings = messages.filter(
      (message): message is string => typeof message === "string",
    );
    if (strings.length > 0) fields[key] = strings;
  }
  return fields;
}
