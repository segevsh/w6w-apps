import type { ActionDefinition } from "@w6w/types";
import { rawFetch } from "../lib/client.ts";
import { postIdParam, publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  postId: string;
}

/**
 * `DELETE /publications/{publicationId}/posts/{postId}`.
 *
 * A **confirmed** post is archived (status becomes `archived`), never
 * removed. A **draft** post is permanently deleted. This cannot be undone
 * for a draft.
 */
const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description:
    "Delete a draft post permanently, or archive a confirmed one. Cannot be undone for a draft.",
  idempotent: true,
  params: [publicationIdParam, postIdParam],
  output: [
    {
      key: "processing",
      type: "boolean",
      label: "True while the delete/archive is still applying",
    },
    { key: "deleted", type: "boolean", label: "True once the delete/archive completed" },
  ],

  async execute(input, ctx) {
    const path = `/publications/${encodeURIComponent(input.publicationId)}/posts/${
      encodeURIComponent(input.postId)
    }`;
    const { status, text } = await rawFetch(ctx, path, { method: "DELETE" });

    if (status === 202) return { processing: true, deleted: false };
    if (status === 204) return { processing: false, deleted: true };
    throw new Error(`beehiiv ${status} for DELETE ${path}: ${text}`);
  },
};

export default postDelete;
