import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one time entry by id (`GET /time_entries/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const timeEntryGet: ActionDefinition<Input> = {
  key: "time-entry-get",
  type: "read",
  resource: "time_entry",
  title: "Get Time Entry",
  description: "Get one time entry by id (`GET /time_entries/{id}`).",
  params: [
    { key: "id", label: "Time entry ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Time entry"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/time_entries/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default timeEntryGet;
