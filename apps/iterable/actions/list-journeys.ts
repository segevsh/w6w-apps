import type { ActionDefinition } from "@w6w/types";
import { call, int, str, strList } from "../lib/client.ts";

/**
 * `GET /api/journeys` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-journeys",
  type: "read",
  resource: "journey",
  title: "List Journeys",
  description: "Journeys (workflows) in the project, paginated (page size max 50).",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    { key: "pageSize", label: "Page Size", type: "number", hint: "Results per page (maximum 50)." },
    { key: "sort", label: "Sort", type: "string" },
    {
      key: "state",
      label: "States",
      type: "string",
      hint: "Comma separated states; default is all non-archived.",
    },
  ],
  output: [
    { key: "journeys", type: "array", label: "Journeys" },
    { key: "totalJourneysCount", type: "number", label: "Total journeys" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const page = int("page", p.page);
    const pageSize = int("pageSize", p.pageSize);
    const sort = str(p.sort);
    const state = strList(p.state);
    ctx.log("info", "Iterable List Journeys");
    const out = await call(ctx, "GET", "/journeys", {
      query: { "page": page, "pageSize": pageSize, "sort": sort, "state": state },
    });
    return out;
  },
};

export default action;
