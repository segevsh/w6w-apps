import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  hash: string;
  page?: number;
  per_page?: number;
}

const intellimatchResults: ActionDefinition<Input> = {
  key: "intellimatch-results",
  type: "read",
  resource: "intellimatch",
  title: "Intellimatch Results",
  description:
    "Fetch the paginated company and contact results of a completed Intellimatch task. A 404 means the export is not ready yet or has expired.",
  params: [{ "key": "hash", "label": "Task hash", "type": "string", "required": true }, {
    "key": "page",
    "label": "Page",
    "type": "number",
  }, { "key": "per_page", "label": "Per page", "type": "number", "hint": "Max 500, default 100." }],
  output: [
    {
      "key": "data",
      "type": "array",
      "label": "Companies with contact name, email, job title and phone",
    },
    { "key": "current_page", "type": "number", "label": "Page" },
    { "key": "total", "type": "number", "label": "Total" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/intellimatch/data", {
      query: { hash: input.hash, page: input.page, per_page: input.per_page },
    });
  },
};

export default intellimatchResults;
