/**
 * Is Docusign up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check) and from "is
 *     there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.docusign.com` is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## The page is real, and that was checked rather than assumed
 *
 * A Statuspage-shaped URL is not evidence of a Statuspage: several vendors serve
 * an HTML catch-all for every unknown path, so `/api/v2/summary.json` "works"
 * and returns the same bytes a nonsense path returns. Verified live on
 * 2026-08-03 against a deliberate control:
 *
 * ```
 * GET status.docusign.com/api/v2/summary.json          -> 200 application/json, 19227 bytes
 * GET status.docusign.com/api/v2/status.json           -> 200 application/json,   216 bytes
 * GET status.docusign.com/api/v2/definitely-not-real.json -> 404, 0 bytes
 * ```
 *
 * Different status, different content type, different size — a real Statuspage,
 * page id `mwr4rgcd2g69`, name "Docusign". `summary.json` rather than
 * `status.json`: the same single request, but it carries the per-component
 * breakdown, and the breakdown is the whole point here (see below).
 *
 * Docusign also publishes `history.rss` and `history.atom`, which this spec's
 * `feed` mechanism could consume. They are deliberately not used: a feed is a
 * log of *incidents*, and this page's component tree answers the sharper
 * question — is the eSignature region my account lives in healthy right now.
 *
 * ## Why the verdict is the eSignature group, not the page rollup
 *
 * Docusign's page covers seven products in component groups — `eSignature`,
 * `CLM`, `Rooms`, `Forms`, `Insight`, `Trusted Service Provider`, `Corporate`,
 * `Third Party Services` — 56 components in all. The page-wide `indicator`
 * therefore goes yellow for a CLM incident or a Learning Portal outage, neither
 * of which this App can touch: it speaks only the eSignature REST API.
 *
 * So the reported `state` is the worst state among the `eSignature` group's
 * components, and the page-wide description is carried in `message` so nothing
 * is hidden. If Docusign ever restructures the page and that group disappears,
 * the check falls back to the page rollup rather than silently reporting `ok`.
 *
 * The eSignature group's members are the regional instances — `NA1`–`NA4`,
 * `EU`, `AU`, `CA`, `JP1`, `USFED`, `FedRAMP`, `DEMO` — which map onto the
 * `base_uri` host a Connection was issued (`na4.docusign.net`, `eu.docusign.net`,
 * `demo.docusign.net`, …). They are reported individually as `esignature/na4`,
 * `esignature/demo` and so on, so a host can see *which* region is down. The
 * check cannot narrow itself to one region: it is `scope: "app"` and
 * `credential: "none"`, so it has no Connection to read a `base_uri` from — and
 * making it per-Connection would multiply one useful call by the number of
 * users.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

/** Worst-first, so a fold can take the maximum. */
const SEVERITY_ORDER: HealthState[] = ["ok", "unknown", "degraded", "down"];

function worst(states: HealthState[]): HealthState {
  return states.reduce<HealthState>(
    (acc, s) => (SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(acc) ? s : acc),
    "ok",
  );
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.docusign.com";

/** The component group this App actually depends on. */
const ESIGNATURE_GROUP = "esignature";

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Docusign platform status",
  description:
    "Atlassian Statuspage for status.docusign.com, narrowed to the eSignature component group and reported per region. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Component[];
    };

    const all = body.components ?? [];
    // Group headers restate their children's worst state — used only to name
    // the children, never reported themselves.
    const groupName = new Map<string, string>();
    for (const c of all) {
      if (c.group && c.id && c.name) groupName.set(c.id, slug(c.name));
    }

    const components: Record<string, { state: HealthState }> = {};
    const esignatureStates: HealthState[] = [];
    for (const c of all) {
      if (!c.name || c.group) continue;
      const parent = c.group_id ? groupName.get(c.group_id) : undefined;
      if (parent !== ESIGNATURE_GROUP) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[`${parent}/${slug(c.name)}`] = { state };
      esignatureStates.push(state);
    }

    const rollup = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
    const pageWide = body.status?.description;

    // No eSignature group in the payload means the page was restructured —
    // fall back to the page rollup rather than silently reporting `ok`.
    if (esignatureStates.length === 0) {
      return {
        state: rollup,
        message: pageWide
          ? `${pageWide} (no eSignature component group found; reporting the page-wide rollup)`
          : "no eSignature component group found; reporting the page-wide rollup",
        ttlSeconds: 60,
      };
    }

    const state = worst(esignatureStates);
    return {
      state,
      message: state === "ok"
        ? `eSignature: all ${esignatureStates.length} regions operational` +
          (pageWide ? ` · page-wide: ${pageWide}` : "")
        : `eSignature regions degraded` + (pageWide ? ` · page-wide: ${pageWide}` : ""),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
