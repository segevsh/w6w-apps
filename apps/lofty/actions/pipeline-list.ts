import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/teamFeatures/lead-pipelines` — the team's lead pipelines.
 *
 * Answers a page plus `get_metadata`; each entry is an `id` and a `name`.
 *
 * The ids are what a workflow filters and assigns with, and the `name` is what
 * `stage` on a lead (and the `stage` filter on List Leads) actually matches —
 * so this is where a stage name comes from when a lead create or update needs
 * one that is spelled exactly as Lofty holds it.
 *
 * The `name` filter is a substring match, and paging is `currPage`/`pageSize`
 * rather than `offset`/`limit` — this endpoint spells them differently from the
 * rest of the API.
 */
interface Input {
  name?: string;
  currPage?: number;
  pageSize?: number;
}

const action: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "read",
  resource: "team-feature",
  title: "List Lead Pipelines",
  description: "List the team's lead pipelines (GET /v1.0/teamFeatures/lead-pipelines).",
  params: [
    {
      key: "name",
      label: "Name filter",
      type: "string",
      hint: "Substring match on the pipeline name.",
    },
    {
      key: "currPage",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Zero-based page index. This endpoint spells the pair currPage/pageSize.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "get_metadata", type: "object", label: "Pagination metadata" },
    { key: "pipelines", type: "array", label: "Lead pipelines" },
  ],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/teamFeatures/lead-pipelines", {
      query: { name: input.name, currPage: input.currPage, pageSize: input.pageSize },
    });
  },
};

export default action;
