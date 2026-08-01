/**
 * Amazon S3 regional endpoints — commercial partition + AWS GovCloud (US).
 *
 * Source of truth: "Amazon S3 endpoints and quotas"
 * https://docs.aws.amazon.com/general/latest/gr/s3.html ("Amazon S3 regular
 * endpoints" table), fetched 2026-07-31. China (`aws-cn` partition, `.com.cn`
 * domain, separate credentials) is deliberately excluded — see README.
 *
 * Why this list exists at all: `w6w.network.allow` only supports an exact
 * hostname or a `"*.<domain>"` subdomain-at-any-depth prefix (see
 * `hostAllowed()` in `@w6w/runtime`). Neither form can express "any AWS
 * region" — `s3.*.amazonaws.com` has the wildcard in the middle, which the
 * matcher does not support; `*.s3.amazonaws.com` only ever matches the
 * legacy global endpoint's virtual-hosted form, not a regional path-style
 * host. So the allowlist enumerates every known regional endpoint by exact
 * hostname instead of leaning on a wildcard shape the sandbox doesn't have.
 */

/** Region code -> path-style REST endpoint host (`s3.<region>.amazonaws.com`). */
export const S3_REGIONS: readonly string[] = [
  // US
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  // Africa
  "af-south-1",
  // Asia Pacific
  "ap-east-1",
  "ap-east-2",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-southeast-5",
  "ap-southeast-6",
  "ap-southeast-7",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  // Canada
  "ca-central-1",
  "ca-west-1",
  // Europe
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  // Israel
  "il-central-1",
  // Mexico
  "mx-central-1",
  // Middle East
  "me-south-1",
  "me-central-1",
  // South America
  "sa-east-1",
  // AWS GovCloud (US) — same signing algorithm and `aws4_request` scope as commercial.
  "us-gov-east-1",
  "us-gov-west-1",
] as const;

const REGION_SET = new Set(S3_REGIONS);

export function isKnownRegion(region: string): boolean {
  return REGION_SET.has(region);
}

/** Path-style REST endpoint host for a region, e.g. `s3.us-east-1.amazonaws.com`. */
export function s3Host(region: string): string {
  if (!isKnownRegion(region)) {
    throw new Error(
      `Unknown AWS region "${region}". Supported regions: ${S3_REGIONS.join(", ")}.`,
    );
  }
  return `s3.${region}.amazonaws.com`;
}

/** Every host this app's actions may reach — one path-style endpoint per known region. */
export const S3_NETWORK_ALLOW: readonly string[] = S3_REGIONS.map((r) => `s3.${r}.amazonaws.com`);
