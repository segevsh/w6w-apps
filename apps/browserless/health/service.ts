/**
 * Is the Browserless region this connection uses up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.browserless.io` is a custom-domain Better Stack page. The Statuspage
 * paths (`/api/v2/summary.json`, `/summary.json`, `/components.json`,
 * `/history.atom`) all 301 back to the page root; `/index.json` answers 200 with
 * Better Stack's `{"data": {"type": "status_page", …}, "included": […]}`
 * document, and the page self-identifies:
 *
 *     id "213963", company_name "Browserless", custom_domain "status.browserless.io"
 *
 * ## Which resources count
 *
 * The page has three sections — "Live Services" (one resource per region: `US
 * East`, `US West`, `London`, `Amsterdam`, plus `Unit and Usage Services`), "Web
 * Pages" and "API Servers" (`Account API`). This app talks to one regional host
 * per connection, so the verdict is that region's resource (`US West` = sfo,
 * `London` = lon, `Amsterdam` = ams). The other resources are listed as detail,
 * capped at `degraded`, and the page aggregate is ignored: an outage in another
 * region says nothing about this one.
 *
 * If the page no longer names the region's resource the answer is `unknown`,
 * never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { regionFromConnection } from "../lib/client.ts";
import type { Region } from "../lib/client.ts";

export const STATUS_HOST = "status.browserless.io";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;
export const PAGE_ID = "213963";

/** The status page's own names for each region's resource. */
export const RESOURCE_NAME: Record<Region, string> = {
  sfo: "US West",
  lon: "London",
  ams: "Amsterdam",
};

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: {
    id?: string;
    attributes?: { company_name?: string; custom_domain?: string };
  };
  included?: BetterStackResource[];
}

export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

function keyOf(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Browserless region status",
  description: "Status of this connection's regional resource (US West, London or Amsterdam) on " +
    "status.browserless.io (Better Stack). Other resources are shown but do not drive the verdict.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const region = regionFromConnection(ctx.connection);
    const watched = RESOURCE_NAME[region];

    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    if (body?.data?.id !== PAGE_ID || !/browserless/i.test(attrs.company_name ?? "")) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Browserless's",
      };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const mine = resources.find((r) => r.attributes?.public_name === watched);
    if (!mine) return { state: "unknown", message: `status page names no "${watched}" resource` };

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((r, i) => {
      const state = mapResourceStatus(r.attributes?.status);
      const shown = r === mine || state !== "down" ? state : "degraded";
      components[keyOf(r, i)] = shown === "ok" ? { state: shown } : {
        state: shown,
        message: r.attributes?.status,
      };
    });

    const state = mapResourceStatus(mine.attributes?.status);
    return {
      state,
      message: state === "ok"
        ? `${watched} operational`
        : `${watched} (${mine.attributes?.status})`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
