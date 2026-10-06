import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";
import { personRef, personRefParams } from "../lib/people.ts";
import type { PersonRef } from "../lib/people.ts";

/**
 * Add Tags — `POST /v1/tags` with `{ tag, id|userId|email }`. Verified against the OpenAPI
 * document (`AddTag`, 201), fetched 2026-10-06: "To add multiple tags, use a comma-separated
 * list". The person must already exist ("Add tag(s) to an existing user").
 */
interface Input extends PersonRef {
  tag: string;
}

const tagAdd: ActionDefinition<Input> = {
  key: "tag-add",
  type: "perform",
  resource: "tags",
  title: "Add Tags to Person",
  description: "Add one or more tags to an existing person. Separate several tags with commas.",
  idempotent: true,
  params: [
    ...personRefParams,
    {
      key: "tag",
      label: "Tag(s)",
      type: "string",
      required: true,
      hint: 'One tag, or several separated by commas: "customer,beta".',
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const tag = (input.tag ?? "").trim();
    if (!tag) throw new Error("`tag` is required.");
    return await new EnchargeClient(ctx).request("POST", "/tags", {
      body: { tag, ...personRef(input) },
    });
  },
};

export default tagAdd;
