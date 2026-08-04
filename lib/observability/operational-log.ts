interface OperationalDetails {
  release?: string;
  dependency?: "configuration" | "database";
}

export function logOperationalFailure(
  event: string,
  error: unknown,
  details: OperationalDetails = {},
): void {
  const errorType = error instanceof Error ? error.name : typeof error;
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event,
      errorType,
      ...details,
    }),
  );
}
