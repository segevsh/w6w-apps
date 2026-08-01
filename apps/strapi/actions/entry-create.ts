import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";
import { collectionParam } from "../lib/params.ts";

interface Input {
  collection: string;
  data: Record<string, unknown>;
}

/**
 * `POST /api/<collection>` — Strapi's create. The request body is always
 * `{ "data": { ...fields } }` — confirmed against Strapi's own REST API docs
 * — the same envelope in both v4 and v5 (only the *response* shape changed
 * between versions; the create/update request body did not).
 */
const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description: "Create a new entry of a content type.",
  idempotent: false,
  params: [
    collectionParam,
    { key: "data", label: "Fields", type: "json", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Created entry" }],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    return client.request(`/api/${encodeURIComponent(input.collection)}`, {
      method: "POST",
      body: { data: input.data },
    });
  },
};

export default entryCreate;
