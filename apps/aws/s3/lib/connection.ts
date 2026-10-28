import type { RedactedConnection } from "@w6w/types";
import { s3Host } from "./regions.ts";

/**
 * Every action needs the account's AWS region to build the request host —
 * but only `sign` ever sees the raw credential, so an action cannot read
 * `region` off it directly. The fix is the same one this pack already uses
 * for Mailgun's US/EU split and every per-tenant-host App (Zendesk, Shopify,
 * Twilio, …): `afterConnect` echoes the non-secret `region` field onto the
 * Connection's `display`, and actions read it from there. See
 * `auth/aws-iam.ts`'s `afterConnect` hook.
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
  return s3Host(regionFromConnection(connection));
}
