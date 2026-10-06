import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { str, text, timestampHint } from "../lib/params.ts";

/** `POST /v2/collections` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionCreate: ActionDefinition<Input> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description: "Create a collection (a folder-like grouping of notes).",
  idempotent: false,
  params: [
    str("title", "Title", { required: true, hint: "Up to 1,000 characters." }),
    text("description", "Description", { hint: "Up to 10,000 characters." }),
    str("id", "Collection ID", { hint: "Optional UUID; Mem generates one when omitted." }),
    str("created_at", "Created at", { hint: timestampHint }),
    str("updated_at", "Updated at", { hint: timestampHint }),
  ],
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "POST", `/v2/collections`, {
      body: pick(input, ["title", "description", "id", "created_at", "updated_at"]),
    });
  },
};

export default collectionCreate;
