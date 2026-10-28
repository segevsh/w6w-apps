import type { RedactedConnection } from "@w6w/types";
import { sesHost } from "./regions.ts";

/**
 * Every action needs the account's AWS region to build the request host, but only `sign` ever
 * sees the raw credential. `auth/aws-iam.ts`'s `afterConnect` echoes the non-secret `region`
 * onto the Connection's `display`, and actions read it from there (same pattern as the S3 app).
 */
export function regionFromConnection(connection: RedactedConnection | undefined): string {
  const region = (connection?.display as { region?: string } | undefined)?.region;
  if (!region) {
    throw new Error(
      "This connection has no region on record. Reconnect the AWS IAM Access Key auth method.",
    );
  }
  return region;
}

export function hostFromConnection(connection: RedactedConnection | undefined): string {
  return sesHost(regionFromConnection(connection));
}
