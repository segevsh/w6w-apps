import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/destinations` — the warehouses, with their setup state.
 *
 * The same objects as `group-list`, described by what they *are* rather than
 * what they contain: the Snowflake account, the BigQuery project, the Databricks
 * workspace being written into.
 *
 * `setup_status` is why this is worth its own action. A destination whose
 * credentials have expired **breaks every connection writing to it at once** —
 * which looks, from `connection-list`, like a dozen unrelated sources failing
 * simultaneously. Checking the destination first turns twelve mysteries into
 * one.
 *
 * The `config` comes back with secrets redacted, so this is safe to read into a
 * workflow that reports on where data is going.
 */
const action: ActionDefinition = {
  key: "destination-list",
  type: "read",
  resource: "destination",
  title: "List destinations",
  description:
    "The warehouses being written into. A destination with expired credentials breaks every " +
    "connection at once — which looks like a dozen unrelated sources failing together.",
  params: [...LIST_PARAMS],
  output: [
    { key: "destinations", type: "array", label: "Destinations" },
    { key: "count", type: "number", label: "Destinations returned" },
    { key: "broken", type: "array", label: "Destinations whose setup is not connected" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll<{
      id?: string;
      service?: string;
      setup_status?: string;
    }>("/v1/destinations", {}, want, Math.max(1, Number(p.maxPages ?? 20)));

    const broken = page.items
      .filter((d) => d?.setup_status && d.setup_status !== "connected")
      .map((d) => `${d?.service ?? "destination"} (${d?.id ?? ""})`);

    return { destinations: page.items, count: page.items.length, broken };
  },
};

export default action;
