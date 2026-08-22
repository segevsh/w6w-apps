/**
 * Is Ashby up? — its Statuspage, with a distinction that matters.
 *
 * Verified 2026-08-18: `status.ashbyhq.com` is a Statuspage instance named
 * "Ashby" (page id `z4btwrl32bd8`) with 30-odd components in six groups.
 *
 * ## Ashby's own services and the services Ashby depends on are both listed
 *
 * The page carries `Ashby API`, `Job Post API`, `Reports API`, `Recruiting`,
 * `Scheduling` and `Hosted Job Boards` — and, in the same list, `Google`,
 * `Slack`, `Zoom`, `SendGrid API v3`, `Office 365`, `AWS`, `Dropbox Sign`,
 * `Microsoft 365` and `Google Calendar`.
 *
 * A roll-up over everything would therefore mark Ashby **down because Zoom is
 * having an incident** — which says nothing about whether this app's calls will
 * work. Third-party components are still worth *seeing*, because a Google
 * Calendar outage genuinely does break scheduling, so they are reported as
 * components with their own states and simply do not count towards the verdict.
 *
 * The verdict is Ashby's own services, and `Ashby API` above all, since that is
 * the surface every action here uses.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.ashbyhq.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** Ashby's own services — these decide the verdict. */
const ASHBYS_OWN = [
  /^ashby api$/i,
  /^job post api$/i,
  /^reports api$/i,
  /^job feed$/i,
  /^recruiting$/i,
  /^scheduling$/i,
  /^hosted job boards$/i,
  /^analytics$/i,
  /^ats sync$/i,
];

/**
 * Vendors Ashby integrates with. Reported, never counted — an incident here is
 * real and is not an Ashby outage.
 */
const THIRD_PARTY = [
  /google/i,
  /slack/i,
  /zoom/i,
  /sendgrid/i,
  /office 365/i,
  /microsoft/i,
  /^aws$/i,
  /dropbox/i,
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Ashby platform status",
  description:
    "Ashby's own services, chiefly the API. Third-party components on the same status page " +
    "(Google, Slack, Zoom, SendGrid) are reported but do not make Ashby down.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Array<{ name?: string; status?: string; group?: boolean }> }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const counted: HealthState[] = [];
    const badOwn: string[] = [];
    const badVendor: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      const isOwn = ASHBYS_OWN.some((re) => re.test(name));
      const isVendor = THIRD_PARTY.some((re) => re.test(name));
      if (!isOwn && !isVendor) continue;

      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };
      if (isOwn) {
        counted.push(state);
        if (c.status !== "operational") badOwn.push(`${name}: ${c.status}`);
      } else if (c.status !== "operational") {
        badVendor.push(`${name}: ${c.status}`);
      }
    }

    if (counted.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names any Ashby service this check watches",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts: string[] = [];
    if (badOwn.length > 0) parts.push(badOwn.join("; "));
    else parts.push(`${counted.length} Ashby services operational`);
    if (badVendor.length > 0) {
      parts.push(`third-party (not counted): ${badVendor.join("; ")}`);
    }

    return {
      state: worstHealthState(counted),
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
