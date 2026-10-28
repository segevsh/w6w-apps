import type { ActionDefinition } from "@w6w/types";
import { compact, GoogleAnalyticsClient } from "../lib/client.ts";

/**
 * `POST /v1beta/{name}:query` — verified against Google's Data API discovery
 * document (`analyticsdata.properties.audienceExports.query`).
 *
 * Reads the rows out of an export that `audience-export-create` started. The
 * export has to have reached `ACTIVE` first — `audience-export-list` reports
 * that state. Unlike the report endpoints this one is addressed by the
 * export's own full resource name, so it takes that rather than a property.
 */
const action: ActionDefinition = {
  key: "audience-export-query",
  type: "read",
  resource: "audienceExport",
  title: "Query an audience export",
  description: "Read the users out of a completed audience export.",
  params: [
    {
      key: "name",
      label: "Audience Export Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "properties/123456789/audienceExports/1234567",
      hint: "The full resource name returned by Create, or listed by List.",
    },
    { key: "limit", label: "Limit", type: "number", default: 1000 },
    { key: "offset", label: "Offset", type: "number", default: null },
  ],
  output: [
    { key: "audienceRows", type: "array", label: "Rows" },
    { key: "rowCount", type: "number", label: "Total rows" },
    { key: "audienceExport", type: "object", label: "Export metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim().replace(/^\/+/, "");
    if (!name) throw new Error("`name` is required");
    if (!name.startsWith("properties/")) {
      throw new Error(
        `\`name\` must be a full resource name like properties/123/audienceExports/456 — got "${name}"`,
      );
    }

    const body = compact({
      limit: typeof p.limit === "number" ? String(p.limit) : undefined,
      offset: typeof p.offset === "number" ? String(p.offset) : undefined,
    });

    ctx.log("info", "querying GA4 audience export", { name });

    return await new GoogleAnalyticsClient(ctx).data(`/${name}:query`, {
      method: "POST",
      body,
    });
  },
};

export default action;
