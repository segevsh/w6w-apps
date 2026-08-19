import type { HealthCheckDefinition } from "@w6w/types";

const SUMMARY = "https://status.tailscale.com/api/v2/summary.json";

/** What this app actually calls. */
const API_COMPONENT = "API (api.tailscale.com)";
/**
 * What the *network* depends on, which is a different question — and one worth
 * reporting even though no action here touches it.
 */
const NETWORK_COMPONENTS = ["Coordination service", "DERP relay servers"];

const RANK: Record<string, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

/**
 * Tailscale's Statuspage — and a distinction this check exists to make.
 *
 * ## An API outage is not a network outage
 *
 * Tailscale's data plane is peer-to-peer. Devices that have already exchanged
 * keys keep talking to each other whether or not `api.tailscale.com` is
 * answering, and whether or not the coordination service is. What an outage
 * stops is *change*: new devices joining, ACL updates propagating, keys being
 * exchanged for connections not yet established.
 *
 * That is unusual enough to be worth stating plainly, because the intuition
 * from every other API in this pack — vendor is down, therefore nothing works
 * — is wrong here. A workflow's calls fail; the tailnet carries on.
 *
 * The feed separates the two, so the check does too:
 *
 * - **API (api.tailscale.com)** — what every action here calls. This drives
 *   the reported state.
 * - **Coordination service** and **DERP relay servers** — what the network
 *   itself leans on. Reported alongside, never as this app's failure, because
 *   an action can succeed perfectly while devices cannot reach each other.
 *
 * DERP is the subtler of the two: relays carry traffic only for peers that
 * could not connect directly, so a DERP outage takes out *some* connections —
 * typically the ones behind hard NATs — while leaving most of the tailnet fine.
 * A per-device symptom with a global cause.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Tailscale status",
  description:
    "Reads Tailscale's Statuspage, weighting the API component that every action here calls. " +
    "Reports the COORDINATION SERVICE and DERP relays separately and never as this app's " +
    "failure — Tailscale's data plane is peer-to-peer, so an API outage stops CHANGE rather " +
    "than traffic.",
  covers: ["service"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["status.tailscale.com"] },

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(SUMMARY, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        state: "unknown",
        message: `the status page answered ${res.status}`,
        latencyMs,
      };
    }

    interface Summary {
      status?: { description?: string; indicator?: string };
      components?: Array<{ name?: string; status?: string }>;
      incidents?: Array<{ name?: string; impact?: string }>;
    }
    let summary: Summary;
    try {
      summary = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the status page did not return JSON", latencyMs };
    }

    const components = summary.components ?? [];
    const byName = (name: string) =>
      components.find((component) => component?.name === name)?.status;

    const api = byName(API_COMPONENT);
    if (!api) {
      // Statuspage component names are editable, so a rename must not read as
      // an outage.
      return {
        state: "unknown",
        message: `the status page no longer lists a component named "${API_COMPONENT}" — it has ` +
          "probably been renamed, which is a check to fix rather than an outage",
        latencyMs,
      };
    }

    const network = NETWORK_COMPONENTS
      .map((name) => ({ name, status: byName(name) }))
      .filter((component) => component.status && component.status !== "operational");
    const networkNote = network.length
      ? `. Separately, ${
        network.map((component) => `${component.name} is ${component.status}`).join(" and ")
      } — that affects the tailnet's own connectivity rather than these actions, and existing ` +
        "peer-to-peer connections keep working regardless"
      : "";

    const incident = (summary.incidents ?? [])[0]?.name;
    const suffix = incident ? ` (${incident})` : "";
    const rank = RANK[api] ?? 0;

    if (rank >= 3) {
      return {
        state: "down",
        message: `${API_COMPONENT} is ${api}${suffix}${networkNote}`,
        latencyMs,
      };
    }
    if (rank >= 1) {
      return {
        state: "degraded",
        message: `${API_COMPONENT} is ${api}${suffix}${networkNote}`,
        latencyMs,
      };
    }
    if (network.length) {
      return {
        state: "degraded",
        message: `${API_COMPONENT} is operational${networkNote}`,
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: summary.status?.description ?? "all components operational",
      latencyMs,
    };
  },
};

export default check;
