import { z } from "zod";

type EnvironmentRecord = Record<string, string | undefined>;

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : typeof value === "string"
        ? value.trim()
        : value,
  z.string().optional(),
);

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: optionalTrimmedString,
  ADMIN_SEED_EMAIL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : typeof value === "string"
          ? value.trim()
          : value,
    z.email().optional(),
  ),
  ADMIN_SEED_PASSWORD: optionalTrimmedString,
  SESSION_SECRET: optionalTrimmedString,
  NEXT_PUBLIC_SITE_URL: optionalTrimmedString,
});

export type PublicDataMode = "database" | "bundled-demo";

export class ServerEnvironmentError extends Error {
  constructor(
    message: string,
    readonly fields: string[] = [],
  ) {
    super(message);
    this.name = "ServerEnvironmentError";
  }
}

function selectedEnvironment(environment: EnvironmentRecord) {
  return {
    NODE_ENV: environment.NODE_ENV,
    DATABASE_URL: environment.DATABASE_URL,
    ADMIN_SEED_EMAIL: environment.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: environment.ADMIN_SEED_PASSWORD,
    SESSION_SECRET: environment.SESSION_SECRET,
    NEXT_PUBLIC_SITE_URL: environment.NEXT_PUBLIC_SITE_URL,
  };
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function getServerEnvironment(
  environment: EnvironmentRecord = process.env,
) {
  const parsed = runtimeEnvironmentSchema.safeParse(
    selectedEnvironment(environment),
  );
  if (!parsed.success) {
    throw new ServerEnvironmentError(
      "The server environment contains invalid values.",
      parsed.error.issues.map(
        (issue) => issue.path.map(String).join(".") || "environment",
      ),
    );
  }

  const result = parsed.data;
  if (result.NODE_ENV !== "production") return result;

  const invalidFields: string[] = [];
  if (!result.DATABASE_URL) invalidFields.push("DATABASE_URL");
  if (!result.SESSION_SECRET || result.SESSION_SECRET.length < 32) {
    invalidFields.push("SESSION_SECRET");
  }
  if (!isHttpUrl(result.NEXT_PUBLIC_SITE_URL)) {
    invalidFields.push("NEXT_PUBLIC_SITE_URL");
  }
  if (invalidFields.length > 0) {
    throw new ServerEnvironmentError(
      "Required production environment values are missing or invalid.",
      invalidFields,
    );
  }
  return result;
}

export function getPublicDataMode(
  environment: EnvironmentRecord = process.env,
): PublicDataMode {
  const runtime = getServerEnvironment(environment);
  if (runtime.DATABASE_URL) return "database";
  if (runtime.NODE_ENV === "production") {
    throw new ServerEnvironmentError(
      "Bundled demo data is disabled in production.",
      ["DATABASE_URL"],
    );
  }
  return "bundled-demo";
}
