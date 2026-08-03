import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient } from "../lib/client.ts";

/**
 * `DELETE /posts/{id}.json`.
 *
 * Ordinarily a soft delete: the post is marked deleted and staff keep a
 * restorable copy.
 *
 * `force_destroy` is offered but deliberately hedged, because the reference
 * attaches two preconditions to it that no parameter can enforce: the forum's
 * `can_permanently_delete` site setting must be on first, and "this endpoint
 * needs to be called first without `force_destroy` and then followed up with a
 * second call 5 minutes later with `force_destroy` to permanently delete".
 *
 * That two-call, five-minute protocol is **not** implemented here. Sleeping for
 * five minutes inside an action would burn a worker for the duration and still
 * be the wrong shape — a workflow with a delay step between two invocations of
 * this action expresses it properly, and can be seen and audited. The flag is
 * exposed so that second call is possible; the hint says what it is for.
 */
interface Input {
  postId: number | string;
  forceDestroy?: boolean;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Remove a post. Soft by default; staff can restore it.",
  // Deleting an already-deleted post converges on the same state.
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
      key: "forceDestroy",
      label: "Permanently delete",
      type: "boolean",
      advanced: true,
      hint: "Only the SECOND half of Discourse's two-step purge: the forum must have " +
        "`can_permanently_delete` enabled, and this call must follow an ordinary delete of the " +
        "same post by at least five minutes. Not recoverable.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "post_id", type: "number", label: "Post ID" },
  ],

  async execute(input, ctx) {
    const postId = String(input.postId);
    await new DiscourseClient(ctx).request(`/posts/${encodeURIComponent(postId)}.json`, {
      method: "DELETE",
      body: compact({ force_destroy: input.forceDestroy }),
    });
    return { deleted: true, post_id: Number(postId) };
  },
};

export default postDelete;
