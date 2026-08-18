import type { ActionDefinition } from "@w6w/types";
import { csv, HomeAssistantClient } from "../lib/client.ts";

/**
 * `GET /api/services` — every service this instance has, with its fields.
 *
 * ## The list is per-instance, because services come from integrations
 *
 * `light.turn_on` exists everywhere. `xiaomi_miio.vacuum_clean_zone` exists
 * only where that integration is installed. There is no universal catalogue to
 * check against, so this is how a workflow finds out what it can actually call
 * — and how to discover the exact spelling of a service whose documentation is
 * a forum post.
 *
 * Each entry carries its `fields`, which is the closest thing to a schema the
 * service data has.
 */
const action: ActionDefinition = {
  key: "service-list",
  type: "read",
  resource: "service",
  title: "List available services",
  description:
    "What this instance can actually do. Services come from installed integrations, so the list " +
    "is per-instance — there is no universal catalogue.",
  params: [
    {
      key: "domains",
      label: "Domains",
      type: "string",
      default: "",
      hint: "Comma-separated, e.g. `light, notify`.",
    },
    {
      key: "includeFields",
      label: "Include Field Schemas",
      type: "boolean",
      default: true,
      hint: "Off returns just the names, which is much smaller — the fields are verbose.",
    },
  ],
  output: [
    { key: "domains", type: "array", label: "Domains with their services" },
    { key: "names", type: "array", label: "Flat `domain.service` names" },
    { key: "count", type: "number", label: "Services available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const all = await new HomeAssistantClient(ctx).request<
      Array<{ domain?: string; services?: Record<string, unknown> }>
    >("/services");
    const list = Array.isArray(all) ? all : [];

    const wanted = csv(p.domains)?.map((d) => d.toLowerCase());
    const filtered = wanted
      ? list.filter((entry) => wanted.includes(String(entry?.domain ?? "").toLowerCase()))
      : list;

    const names: string[] = [];
    for (const entry of filtered) {
      for (const service of Object.keys(entry?.services ?? {})) {
        names.push(`${entry.domain}.${service}`);
      }
    }

    const domains = p.includeFields === false
      ? filtered.map((entry) => ({
        domain: entry.domain,
        services: Object.keys(entry?.services ?? {}),
      }))
      : filtered;

    return { domains, names: names.sort(), count: names.length };
  },
};

export default action;
