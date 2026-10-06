/**
 * Amazon SES regional endpoints — `email.<region>.amazonaws.com`.
 *
 * Source of truth: "Amazon Simple Email Service endpoints and quotas"
 * https://docs.aws.amazon.com/general/latest/gr/ses.html, fetched 2026-10-06 (the table's
 * standard endpoints; the `email-fips.*` hosts and China are deliberately left out). The same
 * 29 regions publish a `ses-<region>` service on the AWS Health dashboard.
 *
 * `w6w.network.allow` takes an exact hostname or a leading `*.` wildcard, never a wildcard in
 * the middle, so `email.*.amazonaws.com` cannot be expressed — every regional host is listed
 * by name, the same way the S3 app does it.
 */
export const SES_REGIONS: readonly string[] = [
  "af-south-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-5",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "us-gov-east-1",
  "us-gov-west-1",
] as const;

const REGION_SET = new Set(SES_REGIONS);

export function isKnownRegion(region: string): boolean {
  return REGION_SET.has(region);
}

/** SES v2 REST endpoint host for a region, e.g. `email.us-east-1.amazonaws.com`. */
export function sesHost(region: string): string {
  if (!isKnownRegion(region)) {
    throw new Error(
      `Unknown AWS region "${region}". Supported regions: ${SES_REGIONS.join(", ")}.`,
    );
  }
  return `email.${region}.amazonaws.com`;
}

/** Every host this app's actions may reach — one endpoint per known region. */
export const SES_NETWORK_ALLOW: readonly string[] = SES_REGIONS.map((r) =>
  `email.${r}.amazonaws.com`
);
