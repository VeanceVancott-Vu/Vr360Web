import "dotenv/config";

import { prisma } from "../lib/database/client";
import {
  analyticsRetentionCutoff,
  getAnalyticsRetentionDays,
} from "../lib/analytics/privacy.server";

async function main() {
  const supportedArguments = new Set(["--apply"]);
  const unsupported = process.argv
    .slice(2)
    .filter((argument) => !supportedArguments.has(argument));
  if (unsupported.length > 0) {
    throw new Error("Unsupported argument: " + unsupported.join(", "));
  }

  const apply = process.argv.includes("--apply");
  const retentionDays = getAnalyticsRetentionDays();
  const cutoff = analyticsRetentionCutoff();
  const where = { createdAt: { lt: cutoff } };
  const expiredCount = await prisma.tourViewEvent.count({ where });

  console.log(
    "Analytics retention: " +
      retentionDays +
      " days; cutoff: " +
      cutoff.toISOString() +
      "; expired rows: " +
      expiredCount +
      ".",
  );

  if (!apply) {
    console.log(
      "Dry run only. Re-run with --apply to permanently delete these expired analytics rows.",
    );
    return;
  }

  const result = await prisma.tourViewEvent.deleteMany({ where });
  console.log("Deleted " + result.count + " expired analytics rows.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Analytics retention command failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
