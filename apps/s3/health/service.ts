/**
 * Is Amazon S3 up? — AWS's public Service Health Dashboard current-events
 * feed, verified live 2026-07-31:
 *
 *   GET https://health.aws.amazon.com/public/currentevents
 *
 * This is the endpoint `https://status.aws.amazon.com` itself redirects to
 * (`301` -> `health.aws.amazon.com/health/status`; the dashboard's own
 * front-end fetches `currentevents` from that origin). It is unauthenticated,
 * CORS-enabled, and returns a flat JSON array of every AWS service+region
 * combination with a currently open or very-recently-resolved event —
 * no AWS account or support plan required (unlike the *AWS Health API*,
 * `health.us-east-1.amazonaws.com`, which needs Business/Enterprise support
 * and IAM credentials — a different, authenticated product this check does
 * NOT use, precisely because a `service` check must stay `credential: "none"`
 * and work before anyone has connected).
 *
 * One documented gotcha: the response's `Content-Type` is
 * `application/json;charset=utf-16` and the body IS UTF-16 (not UTF-8) — the
 * Fetch `Response` body-reading methods (`.text()`/`.json()`) always decode
 * as UTF-8 per the WHATWG spec regardless of the header, so this check reads
 * `arrayBuffer()` and decodes with `TextDecoder("utf-16")` itself. Skipping
 * that step silently mangles every character.
 *
 * S3 publishes one `service` id per region — `s3-us-east-1`, `s3-eu-west-1`,
 * … — listed in the companion `services.json` catalog
 * (`https://servicedata-us-east-1-prod.s3.amazonaws.com/services.json`, also
 * public). This check does not fetch that catalog; it simply matches every
 * event whose `service` starts with `s3-`, which is the same prefix.
 *
 * `scope: "app"` (default for `kind: "service"`) — one fetch answers for
 * every Connection regardless of which region it's signed for, so this
 * reports per-region `components` rather than a single global verdict: a
 * connection scoped to `eu-west-1` should not be told "degraded" because
 * `ap-southeast-2` has an open issue.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "health.aws.amazon.com";
const STATUS_URL = `https://${STATUS_HOST}/public/currentevents`;

interface AwsHealthEvent {
  service?: string;
  status?: string; // "1" = open, "0" = resolved
  region_name?: string;
  summary?: string;
}

/**
 * The feed is UTF-16 (confirmed live: big-endian, with a `FE FF` BOM), and
 * `Response.text()`/`.json()` always decode as UTF-8 regardless of the
 * `Content-Type` header — so this reads raw bytes and decodes explicitly.
 * `TextDecoder("utf-16")` does NOT auto-sniff a BOM to pick LE vs BE (verified:
 * it always decodes as LE, mangling BE input) — the BOM has to be inspected by
 * hand and the matching explicit decoder selected.
 */
function decodeBody(buf: ArrayBuffer): unknown {
  const bytes = new Uint8Array(buf);
  const label = bytes[0] === 0xfe && bytes[1] === 0xff
    ? "utf-16be"
    : bytes[0] === 0xff && bytes[1] === 0xfe
    ? "utf-16le"
    : "utf-8";
  const text = new TextDecoder(label).decode(buf);
  return JSON.parse(text);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Amazon S3 platform status",
  description:
    "AWS's public Service Health Dashboard current-events feed, filtered to S3's per-region services. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL);
    // `unknown`, never `down`: a status API that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status feed returned ${res.status}` };

    let events: AwsHealthEvent[];
    try {
      const parsed = decodeBody(await res.arrayBuffer());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      events = parsed as AwsHealthEvent[];
    } catch {
      return { state: "unknown", message: "status feed returned unparseable data" };
    }

    const s3Events = events.filter((e) =>
      typeof e.service === "string" && e.service.startsWith("s3-")
    );
    const open = s3Events.filter((e) => e.status === "1");

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const e of s3Events) {
      const region = e.service!.replace(/^s3-/, "");
      // AWS's current-events feed carries no severity field beyond
      // open/resolved, so an open event is reported `degraded` rather than
      // guessing at `down` — a real S3 outage would also show up as elevated
      // error rates on the credential/quota checks, which don't have to guess.
      components[region] = { state: e.status === "1" ? "degraded" : "ok", message: e.summary };
    }

    return {
      state: open.length === 0 ? "ok" : "degraded",
      message: open.length
        ? open.map((e) => `${e.region_name ?? e.service}: ${e.summary ?? "open issue"}`).join("; ")
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
