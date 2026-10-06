import type { ActionDefinition } from "@w6w/types";
import { call, int, str, strList } from "../lib/client.ts";

/**
 * `GET /api/campaigns` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "Campaign metadata, paginated. Always pass page/pageSize: the unpaginated form is deprecated by Iterable.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      hint: "Results per page (maximum 1000).",
    },
    { key: "sort", label: "Sort", type: "string", hint: "Field, `-` prefix for descending." },
    {
      key: "campaignState",
      label: "Campaign States",
      type: "string",
      hint: "Comma separated states, e.g. Running,Finished.",
    },
  ],
  output: [
    { key: "campaigns", type: "array", label: "Campaigns" },
    { key: "nextPageUrl", type: "string", label: "Next page URL, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const page = int("page", p.page);
    const pageSize = int("pageSize", p.pageSize);
    const sort = str(p.sort);
    const campaignState = strList(p.campaignState);
    ctx.log("info", "Iterable List Campaigns");
    const out = await call(ctx, "GET", "/campaigns", {
      query: { "page": page, "pageSize": pageSize, "sort": sort, "campaignState": campaignState },
    });
    return out;
  },
};

export default action;
