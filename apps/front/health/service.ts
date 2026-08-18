/**
 * Is Front up? — its own Statuspage, read per-component, with the channels kept
 * separate from the API.
 *
 * The design point is that a shared inbox has **two** ways to be broken, and
 * they are not the same outage:
 *
 *   - **"API and integrations" is down** — nothing this app does works. Every
 *     action fails at the first call.
 *   - **"Gmail" is down** — every read still works, every comment still posts,
 *     and `conversation-reply` on a Gmail channel has nowhere to send. Front's
 *     own app looks fine.
 *
 * Reporting the second as a full outage would be wrong, and folding it into the
 * first would hide it. So the API components roll up normally, while the
 * channel components (Gmail, O365, SMTP, Twilio, Front chat, the rest) are
 * capped at `degraded` however loudly Statuspage shouts — a dead channel is a
 * partial failure of this app, not the end of it.
 *
 * Verified 2026-08-18: the page publishes 16 flat components (no groups) and
 * `status.frontapp.com` **redirects cross-host** to `www.frontstatus.com`. This
 * check calls the final host directly, because a redirect chain is one more
 * thing to be wrong about and the destination is stable.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this token
 *     live" (the derived `auth:api-token` check).
 *   - `scope: "app"` (default) — the same answer for every Connection.
 *   - `credential: "none"` (default) — unauthenticated, and unsigned.
 *   - `network.allow` — the status host is not an API host and is deliberately
 *     absent from the app's own egress allowlist.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "www.frontstatus.com";

/** Everything this app's calls ride on. A failure here is a real outage. */
const API = ["API and integrations", "App", "Rules and Workflows"];

/**
 * Message delivery surfaces. A reply goes out through one of these, so an
 * outage here breaks sending on that channel and nothing else — capped at
 * `degraded` for that reason.
 */
const CHANNELS = [
  "SMTP (non-Gmail / O365)",
  "Gmail",
  "O365",
  "Facebook",
  "Twitter",
  "Twilio",
  "Other channels",
  "Front chat",
];

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Front platform status",
  description:
    "Front's Statuspage, split in two: the API components this app calls, and the message " +
    "channels a reply goes out through — a dead channel is a partial failure, not an outage.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Front.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const byName = new Map<string, Component>();
    for (const c of body.components) {
      if (c.group === true) continue;
      byName.set(String(c.name).toLowerCase(), c);
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];
    let matched = 0;

    for (const [names, cap] of [[API, false], [CHANNELS, true]] as Array<[string[], boolean]>) {
      for (const name of names) {
        const c = byName.get(name.toLowerCase());
        if (!c) continue;
        matched++;
        let state = STATES[String(c.status)] ?? "unknown";
        // A channel outage cannot take the whole app down — reads and comments
        // are unaffected.
        if (cap && state === "down") state = "degraded";
        components[slug(name)] = { state, message: c.status };
        states.push(state);
        if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
      }
    }

    if (matched === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the components this app watches",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0 ? `${matched} components operational` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
