import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatTag } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * Define a new tag on the Page.
 *
 * `POST /fb/page/createTag` with `{ name }` → `{ status, data: { tag: { id,
 * name } } }`. Note the extra nesting: `data.tag`, not `data` — `createCustomField`
 * does the same thing with `data.field`, while every *list* endpoint returns the
 * array directly under `data`. That asymmetry is in the spec, not a transcription
 * slip.
 *
 * `idempotent: false`. The spec does not say what a duplicate name does, and this
 * app does not guess: if a repeat creates a second tag the retry has changed the
 * Page, and if it errors the retry has not reproduced the first call's result.
 * Either way it is not safe to replay. Use `add-subscriber-tag` with a tag name
 * when the intent is "tag this person, creating the tag if needed" — that is what
 * `addTagByName` is for.
 */
const createTag: ActionDefinition<Input> = {
  key: "create-tag",
  type: "perform",
  idempotent: false,
  resource: "tag",
  title: "Create Tag",
  description:
    "Define a new tag on the Page (POST /fb/page/createTag). Returns the tag under `data.tag`.",
  params: [
    {
      key: "name",
      label: "Tag name",
      type: "string",
      required: true,
      hint: "Manychat tag names are Page-wide, not per-subscriber.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Result (`data.tag`)" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope<{ tag?: ManychatTag }>>(
      "/fb/page/createTag",
      { name: input.name },
    );
  },
};

export default createTag;
