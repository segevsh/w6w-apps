/**
 * Is Fortnox's API up?
 *
 * ## The status page is real — verified 2026-10-06
 *
 * `status.fortnox.se` is an Atlassian Statuspage (`x-statuspage-version`
 * header). Its `/api/v2/summary.json` answers 200 with ~20 KB of genuine JSON,
 * `page.id` `59p4x6wt7tfd`, `page.name` `Fortnox`,
 * `page.url` `https://status.fortnox.se`, and about sixty components in Swedish
 * groups (Produkter, Integrationer, Webbplatser, …). The host does not redirect.
 *
 * ## The page is Fortnox's whole company, not just the API
 *
 * The page-level `status.indicator` rolls up every component — Danske Bank,
 * Bolagsverket, Telefoni, the marketing site — so an unrelated incident would
 * flag a healthy API. This check therefore ignores the indicator and judges
 * only the component named **`Fortnox API`** (id `dlc79kkln1cj`, no parent
 * group) plus **`Fortnox ID`** (id `z4z7jl1vhtw8`), the login service the OAuth
 * flow goes through. If the API component is absent the answer is `unknown`,
 * never `ok`.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * because it is the precondition for widening `network` below — the status
 * host must never see an access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.fortnox.se/api/v2/summary.json";
export const STATUS_PAGE_ID = "59p4x6wt7tfd";
export const API_COMPONENT_ID = "dlc79kkln1cj";
export const LOGIN_COMPONENT_ID = "z4z7jl1vhtw8";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fortnox API status",
  description:
    "Status of the `Fortnox API` and `Fortnox ID` (login) components on Fortnox's Atlassian Statuspage (status.fortnox.se). Other components on the page are unrelated to the API and are ignored.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.fortnox.se"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Fortnox itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== STATUS_PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Fortnox's" };
    }

    const all = body.components ?? [];
    const api = all.find((c) => c.id === API_COMPONENT_ID && c.name === "Fortnox API");
    if (!api) {
      return { state: "unknown", message: "Status page has no `Fortnox API` component" };
    }
    const login = all.find((c) => c.id === LOGIN_COMPONENT_ID);

    const components: Record<string, HealthComponentReport> = {};
    for (const c of [api, login]) {
      if (!c?.id) continue;
      const state = mapComponentStatus(c.status);
      components[c.id] = state === "ok"
        ? { state, message: c.name }
        : { state, message: `${c.name}: ${c.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = [api, login].filter((c) => c && mapComponentStatus(c.status) !== "ok");
    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((c) => `${c!.name} (${c!.status})`).join(", ")}`);
    }
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
