import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  personId: string;
  tagId: string;
}

/** `POST /api/v2/signup_taggings` — confirmed against the vendor's OpenAPI spec. Tags a person. */
const personTagAdd: ActionDefinition<Input> = {
  key: "person-tag-add",
  type: "perform",
  resource: "person",
  title: "Tag Person",
  description: "Apply an existing tag to a person. Use `tag-list` or `tag-create` for the tag ID.",
  idempotent: false,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "tagId", label: "Tag ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Tagging ID" },
    { key: "signup_id", type: "string", label: "Person ID" },
    { key: "tag_id", type: "string", label: "Tag ID" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/signup_taggings", {
      method: "POST",
      body: dataEnvelope("signup_taggings", {
        signup_id: input.personId,
        tag_id: input.tagId,
      }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default personTagAdd;
