import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";
import { collectionParam, idParam } from "../lib/params.ts";

interface Input {
  collection: string;
  id: string;
}

/** `DELETE /api/<collection>/<id>` — deleting an already-deleted entry 404s either way. */
const entryDelete: ActionDefinition<Input> = {
  key: "entry-delete",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Delete an entry by ID.",
  idempotent: true,
  params: [collectionParam, idParam],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    return client.request(
      `/api/${encodeURIComponent(input.collection)}/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
  },
};

export default entryDelete;
