import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  filterId?: number;
  userId?: number;
  firstChar?: string;
  start?: number;
  limit?: number;
  sort?: string;
}

/** GET /persons — list persons, optionally filtered. Paginated via `start`/`limit`. */
const personGetMany: ActionDefinition<Input> = {
  key: "person-get-many",
  type: "read",
  resource: "person",
  title: "Get Many Persons",
  description: "List persons, optionally filtered by owner, saved filter or first character.",
  params: [
    { key: "filterId", label: "Filter ID", type: "number", hint: "ID of a saved filter." },
    { key: "userId", label: "Owner (user ID)", type: "number" },
    {
      key: "firstChar",
      label: "First character",
      type: "string",
      hint: "Return only persons whose name starts with this letter.",
    },
    { key: "start", label: "Start (offset)", type: "number", default: 0 },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "sort", label: "Sort", type: "string", hint: "e.g. `add_time DESC`." },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "array", label: "Persons" },
    { key: "additional_data", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/persons", {
      query: compact({
        filter_id: input.filterId,
        user_id: input.userId,
        first_char: input.firstChar,
        start: input.start,
        limit: input.limit,
        sort: input.sort,
      }),
    });
  },
};

export default personGetMany;
