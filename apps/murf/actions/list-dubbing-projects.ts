import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  next?: string;
}

const listDubbingProjects: ActionDefinition<Input> = {
  key: "list-dubbing-projects",
  type: "search",
  resource: "dubbing-project",
  title: "List Dubbing Projects",
  description:
    "List Murf Dub projects (GET /v1/murfdub/projects/list), one page at a time. Pass the returned `next` back to read the next page; it is absent on the last page. Needs the Murf Dub API key.",
  params: [
    { key: "limit", label: "Page size", type: "number", validation: { min: 1, integer: true } },
    {
      key: "next",
      label: "Next page token",
      type: "string",
      hint: "The `next` from the previous page.",
    },
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "next", type: "string", label: "Token for the next page, when there is one" },
  ],

  async execute(input, ctx) {
    return await new MurfClient(ctx).call("/v1/murfdub/projects/list", {
      query: { limit: input.limit, next: input.next },
    });
  },
};

export default listDubbingProjects;
