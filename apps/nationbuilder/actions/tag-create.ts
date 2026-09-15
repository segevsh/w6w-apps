import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `POST /api/v2/signup_tags` — confirmed against the vendor's OpenAPI spec.
 * Tag names are "a unique, case-insensitive string" per the schema, so
 * creating one that already exists is expected to fail rather than return
 * the existing tag — this action does not attempt to catch or dedupe that.
 */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a new tag. Fails if a tag with the same name already exists.",
  idempotent: false,
  params: [{ key: "name", label: "Name", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/signup_tags", {
      method: "POST",
      body: dataEnvelope("signup_tags", { name: input.name }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default tagCreate;
