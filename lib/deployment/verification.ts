type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type JsonRecord = Record<string, unknown>;

export interface DeploymentVerificationReport {
  origin: string;
  release: string;
  dataSource: "database" | "bundled-demo";
  tourSlug: string;
  publishedScenes: number;
}

export class DeploymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentVerificationError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

export function deploymentBaseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new DeploymentVerificationError(
      "Deployment URL must be an absolute HTTP(S) URL.",
    );
  }

  if (
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && isLocalHostname(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new DeploymentVerificationError(
      "Use an HTTPS origin without credentials, query parameters, fragments, or paths. HTTP is allowed only for localhost.",
    );
  }
  return new URL(url.origin);
}

async function requestJson(
  url: URL,
  label: string,
  fetchImplementation: FetchImplementation,
  requireNoStore = false,
): Promise<JsonRecord> {
  let response: Response;
  try {
    response = await fetchImplementation(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new DeploymentVerificationError(label + " could not be reached.");
  }

  if (!response.ok) {
    throw new DeploymentVerificationError(
      label + " returned HTTP " + response.status + ".",
    );
  }
  if (
    requireNoStore &&
    !response.headers.get("cache-control")?.toLowerCase().includes("no-store")
  ) {
    throw new DeploymentVerificationError(
      label + " must return Cache-Control: no-store.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DeploymentVerificationError(
      label + " did not return valid JSON.",
    );
  }
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new DeploymentVerificationError(
      label + " returned an unexpected response envelope.",
    );
  }
  return body.data;
}

export async function verifyDeployment(
  input: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<DeploymentVerificationReport> {
  const baseUrl = deploymentBaseUrl(input);
  const livenessUrl = new URL("/api/health/live", baseUrl);
  const readinessUrl = new URL("/api/health", baseUrl);
  const toursUrl = new URL("/api/tours?page=1&pageSize=1", baseUrl);

  const liveness = await requestJson(
    livenessUrl,
    "Liveness check",
    fetchImplementation,
    true,
  );
  if (liveness.liveness !== "alive" || typeof liveness.release !== "string") {
    throw new DeploymentVerificationError(
      "Liveness check did not report an alive release.",
    );
  }

  const readiness = await requestJson(
    readinessUrl,
    "Readiness check",
    fetchImplementation,
    true,
  );
  if (
    readiness.readiness !== "ready" ||
    readiness.release !== liveness.release ||
    (readiness.dataSource !== "database" &&
      readiness.dataSource !== "bundled-demo")
  ) {
    throw new DeploymentVerificationError(
      "Readiness check did not report the same ready release.",
    );
  }
  if (
    !isLocalHostname(baseUrl.hostname) &&
    (readiness.environment !== "production" ||
      readiness.dataSource !== "database")
  ) {
    throw new DeploymentVerificationError(
      "A remote deployment must report production database mode.",
    );
  }

  const tours = await requestJson(
    toursUrl,
    "Published tour listing",
    fetchImplementation,
  );
  if (!Array.isArray(tours.items) || !isRecord(tours.items[0])) {
    throw new DeploymentVerificationError(
      "No published tour is available after deployment.",
    );
  }
  const tourSlug = tours.items[0].slug;
  if (typeof tourSlug !== "string" || tourSlug.length === 0) {
    throw new DeploymentVerificationError(
      "The published tour has no valid slug.",
    );
  }

  const tourUrl = new URL(
    "/api/tours/" + encodeURIComponent(tourSlug),
    baseUrl,
  );
  const tour = await requestJson(
    tourUrl,
    "Published tour detail",
    fetchImplementation,
  );
  if (!Array.isArray(tour.scenes) || tour.scenes.length === 0) {
    throw new DeploymentVerificationError(
      "The deployed tour has no published scenes.",
    );
  }

  return {
    origin: baseUrl.origin,
    release: liveness.release,
    dataSource: readiness.dataSource,
    tourSlug,
    publishedScenes: tour.scenes.length,
  };
}
