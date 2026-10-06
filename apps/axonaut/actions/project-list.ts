import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/projects` — List projects, optionally filtered by name or number.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  name?: string;
  number?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects, optionally filtered by name or number.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "name", label: "Name", type: "string", hint: "Name filter." },
    { key: "number", label: "Number", type: "string", hint: "Project number." },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/projects`, {
      query: { "name": input.name, "number": input.number },
      page: input.page,
    });
  },
};

export default projectList;
