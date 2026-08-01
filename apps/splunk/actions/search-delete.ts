import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";

interface Input {
  sid: string;
}

/** Cancel and delete a search job, freeing its resources early. */
const searchDelete: ActionDefinition<Input> = {
  key: "search-delete",
  type: "perform",
  resource: "search",
  title: "Delete Search Job",
  description: "Cancel and delete a search job by `sid`.",
  idempotent: true,
  params: [{ key: "sid", label: "Search job ID (sid)", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Whether the delete request succeeded" }],

  async execute(input, ctx) {
    await new SplunkClient(ctx).request(`/services/search/jobs/${encodeURIComponent(input.sid)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default searchDelete;
