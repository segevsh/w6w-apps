import type { ActionDefinition } from "@w6w/types";
import { FivetranClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/metadata/connector-types` — every source Fivetran can read.
 *
 * The catalogue, and the answer to "can we get data out of X" without opening
 * a browser. Several hundred entries, each with the `service` identifier a
 * connection is created with, the source's icon, and its documentation link.
 *
 * The practical use in a workflow is a check rather than a report: before
 * automating the creation of a connection, confirm the `service` string is
 * real. Fivetran rejects an unknown one, but it rejects it at creation time
 * with a message about configuration rather than about the name.
 *
 * This is metadata rather than account data, so it is the same for everybody
 * and safe to cache.
 */
const action: ActionDefinition = {
  key: "connector-type-list",
  type: "read",
  resource: "metadata",
  title: "List connector types",
  description:
    "Every source Fivetran can read, with the `service` identifier a connection is created with. " +
    "Metadata rather than account data, so it is the same for everybody.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      default: "",
      hint: "Filters the returned list by name or service, case-insensitively.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connectorTypes", type: "array", label: "Available sources" },
    { key: "count", type: "number", label: "Sources returned" },
    { key: "services", type: "array", label: "Just the service identifiers" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll<{ id?: string; name?: string; service?: string }>(
      "/v1/metadata/connector-types",
      { query: query({}) },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    const search = String(p.search ?? "").trim().toLowerCase();
    // Fivetran has no server-side search here, so it is applied to the page.
    const items = search
      ? page.items.filter((t) =>
        `${t?.name ?? ""} ${t?.service ?? ""} ${t?.id ?? ""}`.toLowerCase().includes(search)
      )
      : page.items;

    return {
      connectorTypes: items,
      count: items.length,
      services: items.map((t) => String(t?.service ?? t?.id ?? "")).filter(Boolean),
    };
  },
};

export default action;
