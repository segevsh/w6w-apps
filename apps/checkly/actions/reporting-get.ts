import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient, csv } from "../lib/client.ts";

/**
 * `GET /v1/reporting` — verified against Checkly's OpenAPI document
 * (`getV1Reporting`).
 *
 * Aggregated success rate and response times per check over a window — the
 * numbers an availability report is built from, without paging every result.
 *
 * Note what it aggregates: the checks Checkly runs, not the account's own API
 * usage. It is monitoring data, not billing data.
 */
const action: ActionDefinition = {
  key: "reporting-get",
  type: "read",
  resource: "report",
  title: "Get an availability report",
  description: "Aggregated success rate and response times per check over a window.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      default: "",
      hint: "Unix timestamp. Blank uses Checkly's default window.",
    },
    { key: "to", label: "To", type: "string", default: "", hint: "Unix timestamp." },
    {
      key: "filterByTags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. Narrows to checks carrying them.",
    },
    {
      key: "deactivated",
      label: "Include Deactivated",
      type: "boolean",
      default: false,
      hint: "Deactivated checks contributed no runs, so including them dilutes the averages.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    ctx.log("info", "getting a Checkly availability report", {});

    return await new ChecklyClient(ctx).request("/v1/reporting", {
      query: {
        from: (p.from as string) || undefined,
        to: (p.to as string) || undefined,
        filterByTags: csv(p.filterByTags),
        deactivated: p.deactivated === true ? "true" : undefined,
      },
    });
  },
};

export default action;
