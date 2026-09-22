import type { ActionDefinition } from "@w6w/types";
import { PracticeBetterClient } from "../lib/client.ts";

/**
 * `POST /tags` (`operationId: Tag_Save`) — create a tag.
 *
 * Security: `[read, write]`. The body is `name` (required) plus an optional
 * `notes`, and the response is the created tag's `{id, name}`.
 *
 * Not idempotent: a second call creates a second tag rather than returning the
 * first. Use `list-tags` first when a retry must not leave a duplicate behind.
 */
interface Input {
  name: string;
  notes?: string;
}

const createTag: ActionDefinition<Input, { id?: string; name?: string }> = {
  key: "create-tag",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag with an optional note. Returns the new tag's id and name.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "The tag's name, as it will show against a client.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "string",
      hint: "Optional note stored with the tag.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<{ id?: string; name?: string }>("/tags", {
      method: "POST",
      body: { name: input.name, notes: input.notes },
    });
  },
};

export default createTag;
