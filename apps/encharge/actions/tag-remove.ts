import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";
import { personRef, personRefParams } from "../lib/people.ts";
import type { PersonRef } from "../lib/people.ts";

/**
 * Remove Tags — `DELETE /v1/tags` with a JSON body `{ tag, id|userId|email }`. Verified against
 * the OpenAPI document (`RemoveTag`, 204), fetched 2026-10-06: the body, not the query string,
 * carries the tag and the person.
 */
interface Input extends PersonRef {
  tag: string;
}

const tagRemove: ActionDefinition<Input> = {
  key: "tag-remove",
  type: "perform",
  resource: "tags",
  title: "Remove Tags from Person",
  description: "Remove one or more tags from an existing person. Separate several tags with " +
    "commas.",
  idempotent: true,
  params: [
    ...personRefParams,
    {
      key: "tag",
      label: "Tag(s)",
      type: "string",
      required: true,
      hint: 'One tag, or several separated by commas: "trial,lead".',
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const tag = (input.tag ?? "").trim();
    if (!tag) throw new Error("`tag` is required.");
    return await new EnchargeClient(ctx).request("DELETE", "/tags", {
      body: { tag, ...personRef(input) },
    });
  },
};

export default tagRemove;
