import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";
import { collectionParam, idParam } from "../lib/params.ts";

interface Input {
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

/**
 * `PUT /api/<collection>/<id>` — Strapi's update, merging `data` into the
 * existing entry. Re-sending the same `data` converges on the same result, so
 * this is marked idempotent.
 */
const entryUpdate: ActionDefinition<Input> = {
  key: "entry-update",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description: "Update fields on an existing entry.",
  idempotent: true,
  params: [
    collectionParam,
    idParam,
    { key: "data", label: "Fields to update", type: "json", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Updated entry" }],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    return client.request(
      `/api/${encodeURIComponent(input.collection)}/${encodeURIComponent(input.id)}`,
      {
        method: "PUT",
        body: { data: input.data },
      },
    );
  },
};

export default entryUpdate;
