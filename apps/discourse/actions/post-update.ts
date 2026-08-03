import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";
import { postOutput, rawParam } from "../lib/params.ts";

/**
 * `PUT /posts/{id}.json` — edit a post's Markdown.
 *
 * The body nests under `post`, and `raw` is **required inside it**: this is a
 * full replacement of the body text, not a patch. There is no way to append.
 *
 * `bypass_bump` skips bumping the topic to the top of the latest list. The
 * reference notes it "Requires staff or TL4 permissions", so a key without them
 * gets the edit but not the suppression — it is offered as advanced with that
 * caveat stated rather than hidden.
 *
 * `edit_reason` is what appears in the post's edit history. Discourse keeps
 * every revision, so an edit made by an integration is visible to the community
 * either way; supplying a reason is the difference between a legible audit trail
 * and an unexplained change.
 */
interface Input {
  postId: number | string;
  raw: string;
  editReason?: string;
  bypassBump?: boolean;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Replace a post's Markdown body.",
  // Writing the same text twice leaves the post identical; Discourse records no
  // second revision for an unchanged body.
  idempotent: true,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      ...rawParam,
      hint: "Replaces the whole body — this endpoint has no append mode.",
    },
    {
      key: "editReason",
      label: "Edit reason",
      type: "string",
      hint: "Shown in the post's public edit history.",
    },
    {
      key: "bypassBump",
      label: "Do not bump the topic",
      type: "boolean",
      advanced: true,
      hint: "Requires a staff or TL4 key; ignored otherwise.",
    },
  ],
  output: postOutput,

  async execute(input, ctx) {
    const body = await new DiscourseClient(ctx).request<{ post?: unknown }>(
      `/posts/${encodeURIComponent(String(input.postId))}.json`,
      {
        method: "PUT",
        body: compact({
          post: compact({ raw: input.raw, edit_reason: unset(input.editReason) }),
          bypass_bump: input.bypassBump,
        }),
      },
    );
    // This endpoint envelopes under `post`; `post-get` on the same path does not.
    return body?.post ?? body;
  },
};

export default postUpdate;
