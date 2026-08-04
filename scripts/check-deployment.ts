import "dotenv/config";

import {
  DeploymentVerificationError,
  verifyDeployment,
} from "../lib/deployment/verification";

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length > 1) {
    throw new DeploymentVerificationError(
      "Provide one deployment origin or set DEPLOYMENT_URL.",
    );
  }
  const target = arguments_[0]?.trim() || process.env.DEPLOYMENT_URL?.trim();
  if (!target) {
    throw new DeploymentVerificationError(
      "Provide a deployment origin or set DEPLOYMENT_URL.",
    );
  }

  const report = await verifyDeployment(target);
  console.log("Deployment verification passed.");
  console.log("Origin: " + report.origin);
  console.log("Release: " + report.release);
  console.log("Data source: " + report.dataSource);
  console.log(
    "Tour: " +
      report.tourSlug +
      " (" +
      report.publishedScenes +
      " published scenes)",
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Deployment verification failed.",
  );
  process.exitCode = 1;
});
