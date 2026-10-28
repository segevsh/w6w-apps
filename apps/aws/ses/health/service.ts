/**
 * Is Amazon SES up? — AWS's public Service Health Dashboard current-events feed (the endpoint
 * `status.aws.amazon.com` itself loads), the same source the S3 app reads:
 *
 *   GET https://health.aws.amazon.com/public/currentevents
 *
 * Unauthenticated — NOT the AWS Health API (`health.us-east-1.amazonaws.com`), which needs a
 * Business/Enterprise support plan and IAM credentials. The body is UTF-16 (a `FE FF` BOM was
 * seen live on 2026-10-06) while `Content-Type` says `application/json;charset=utf-16`, and
 * `Response.text()` always decodes UTF-8, so this reads bytes and picks the decoder by BOM.
 *
 * SES publishes one service id per region, `ses-<region>` (29 of them in the public
 * `services.json` catalog, verified 2026-10-06), so events are matched on the `ses-` prefix and
 * reported per region as `components`. The per-region `status.aws.amazon.com/rss/ses-<region>.rss`
 * feeds exist too, but 29 of them would need 29 allowlist entries to say what one fetch says.
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

/** `TextDecoder("utf-16")` does not sniff a BOM — pick BE/LE by hand. */
function decodeBody(buf: ArrayBuffer): unknown {
  const bytes = new Uint8Array(buf);
  const label = bytes[0] === 0xfe && bytes[1] === 0xff
    ? "utf-16be"
    : bytes[0] === 0xff && bytes[1] === 0xfe
    ? "utf-16le"
    : "utf-8";
  return JSON.parse(new TextDecoder(label).decode(buf));
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Amazon SES platform status",
  description:
    "AWS's public Service Health Dashboard current-events feed, filtered to SES's per-region services. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL);
    // `unknown`, never `down`: a status feed that itself fails says nothing about SES.
    if (!res.ok) return { state: "unknown", message: `status feed returned ${res.status}` };

    let events: AwsHealthEvent[];
    try {
      const parsed = decodeBody(await res.arrayBuffer());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      events = parsed as AwsHealthEvent[];
    } catch {
      return { state: "unknown", message: "status feed returned unparseable data" };
    }

    const sesEvents = events.filter((e) =>
      typeof e.service === "string" && e.service.startsWith("ses-")
    );
    const open = sesEvents.filter((e) => e.status === "1");

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const e of sesEvents) {
      const region = e.service!.replace(/^ses-/, "");
      // The feed has no severity beyond open/resolved, so an open event is `degraded`, not `down`.
      // An open event outranks a resolved one for the same region.
      if (components[region]?.state === "degraded") continue;
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
