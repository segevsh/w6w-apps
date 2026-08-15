import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `DELETE /v3/a/{account_id}/tags/{tag_id}.json` — Removing a Tag.
 *
 * Answers `204 No Content` on success — nothing to unwrap. Idempotent in the
 * sense the runtime cares about: the end state after one call and after five
 * is the same tag gone. A repeat call on an already-deleted id answers `404`,
 * which surfaces as an error rather than being swallowed.
 */
interface Input {
  accountId: string;
  tagId: string;
}

const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Delete a tag. Removes it from every call flow and interaction it was applied " +
    "to. To stop new applications without deleting history, use Update Tag with Disabled instead.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tags result.",
    },
  ],
  output: [
    { key: "tagId", type: "string", label: "Tag deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new CallRailClient(ctx).status(
      `/a/${encodeId(input.accountId)}/tags/${encodeId(input.tagId)}.json`,
      { method: "DELETE" },
    );
    return { tagId: input.tagId, status };
  },
};

export default tagDelete;
