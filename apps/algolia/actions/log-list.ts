import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";

/**
 * `GET /1/logs` — verified against Algolia's OpenAPI document (`getLogs`; ACL
 * `logs`).
 *
 * The API call log: what was requested, from where, with what response code and
 * how long it took. Useful for working out which integration is issuing a
 * surprising write, which is otherwise invisible.
 */
const action: ActionDefinition = {
  key: "log-list",
  type: "read",
  resource: "log",
  title: "List API logs",
  description: "Read the application's recent API calls.",
  params: [
    { key: "offset", label: "Offset", type: "number", default: null },
    {
      key: "length",
      label: "Length",
      type: "number",
      default: 10,
      hint: "Algolia's maximum is 1,000.",
    },
    {
      key: "indexName",
      label: "Index",
      type: "string",
      default: "",
      hint: "Only calls against this index.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "all", label: "All" },
        { value: "query", label: "Queries" },
        { value: "build", label: "Builds" },
        { value: "error", label: "Errors" },
      ],
    },
  ],
  output: [{ key: "logs", type: "array", label: "Log entries" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    ctx.log("info", "listing Algolia logs");

    return await new AlgoliaClient(ctx).request("/1/logs", {
      read: true,
      query: {
        offset: typeof p.offset === "number" ? p.offset : undefined,
        length: typeof p.length === "number" ? p.length : undefined,
        indexName: (p.indexName as string) || undefined,
        type: (p.type as string) || undefined,
      },
    });
  },
};

export default action;
