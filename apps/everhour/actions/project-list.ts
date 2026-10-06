import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /projects` — List projects, optionally by name or integration.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  query?: string;
  platform?: string;
  limit?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects, optionally by name or integration.",
  params: [
    { key: "query", label: "Name contains", type: "string" },
    {
      key: "platform",
      label: "Integration",
      type: "select",
      options: [
        { value: "as", label: "as" },
        { value: "ev", label: "ev" },
        { value: "b3", label: "b3" },
        { value: "b2", label: "b2" },
        { value: "pv", label: "pv" },
        { value: "gh", label: "gh" },
        { value: "in", label: "in" },
        { value: "tr", label: "tr" },
        { value: "jr", label: "jr" },
      ],
      hint: "Only projects from this integration (`ev` is Everhour itself).",
    },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max results." },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/projects`, {
      query: { "platform": input.platform, "query": input.query, "limit": input.limit },
    });
  },
};

export default projectList;
