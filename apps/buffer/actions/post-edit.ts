import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList, unset } from "../lib/client.ts";
import {
  assetParams,
  buildAssets,
  buildMetadata,
  metadataParam,
  MUTATION_ERROR_TAIL,
  POST_FIELDS,
  postOutput,
  schedulingTypeOptions,
  shareModeOptions,
} from "../lib/params.ts";

/**
 * `mutation editPost(input: EditPostInput!)` — change a post that has not gone
 * out yet.
 *
 * ## Omission is meaningful here, in three different ways
 *
 * `EditPostInput` is not "the create input plus an id". Buffer gives three of
 * its fields explicit omit-semantics, and they are not the same semantics:
 *
 *  - **`assets`** — *"Omit to preserve the existing list, pass an empty array
 *    to clear it."* So blank ≠ empty, and the raw **Assets** field is the only
 *    way to say "remove the images": `[]`.
 *  - **`mode`** — *"Omit the field or pass null to make no scheduling change —
 *    null does not clear or reset the schedule: a scheduled post keeps its
 *    current share mode, queue slot, and any custom time, and the edit applies
 *    only the other provided fields."* Which is why `mode` is optional here and
 *    required on `post-create`.
 *  - **`approvalChange`** — changes the post's approval state alongside the
 *    edit, *"Only valid when your posting policy on the post's channel requires
 *    approval, and only on your own drafts"*, and *"Asking for the state the
 *    post is already in does nothing."*
 *
 * `compact()` therefore drops blanks rather than forwarding empty strings, and
 * every optional field left untouched in the form is genuinely absent from the
 * mutation.
 *
 * ## `approvalChange` is not exposed
 *
 * It is a `PostApprovalChange` enum whose members Buffer's reference does not
 * render (the docs site ships no enum values at all — see `lib/params.ts`), and
 * unlike every other enum in this app it does not appear in the published CLI's
 * generated metadata either, because the CLI does not surface it as a flag. A
 * `select` here would be guessed members, and a free-text field would be a trap
 * dressed as a feature. It is listed under "deliberately not built" instead.
 *
 * ## Same 200-that-means-failure as `post-create`
 *
 * `editPost` returns the same `PostActionPayload` union, including
 * `RestProxyError` for a network-side rejection and `NotFoundError` for an id
 * that does not resolve — all with HTTP 200. Routed through
 * `BufferClient.mutate` for the same reason.
 *
 * Idempotent: re-sending the same edit for the same id converges on the same
 * post rather than creating another one.
 */
const EDIT_POST = `mutation W6wEditPost($input: EditPostInput!) {
  editPost(input: $input) {
${MUTATION_ERROR_TAIL}
    ... on PostActionSuccess {
      post {
${POST_FIELDS}
      }
    }
  }
}`;

interface Input {
  postId: string;
  text?: string;
  mode?: string;
  schedulingType?: string;
  dueAt?: string;
  saveToDraft?: boolean;
  tagIds?: string;
  imageUrls?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  assets?: unknown;
  metadata?: unknown;
  aiAssisted?: boolean;
}

const postEdit: ActionDefinition<Input> = {
  key: "post-edit",
  type: "perform",
  resource: "post",
  title: "Edit Post",
  description:
    "Change the text, schedule, assets or metadata of a post that has not been sent. Fields " +
    "left blank are not touched.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "text",
      label: "Text",
      type: "text",
      config: { multiline: true },
      hint: "Leave blank to keep the current text.",
    },
    {
      key: "mode",
      label: "When to publish",
      type: "select",
      options: shareModeOptions,
      hint: "Leave blank to make **no scheduling change** — the post keeps its slot and any " +
        "custom time. Set `Custom scheduled time` together with **Scheduled for** to move it.",
    },
    {
      key: "schedulingType",
      label: "Publishing",
      type: "select",
      options: schedulingTypeOptions,
      advanced: true,
    },
    {
      key: "dueAt",
      label: "Scheduled for",
      type: "datetime",
      hint: "ISO 8601 UTC. Pair with **When to publish** = `Custom scheduled time`.",
    },
    {
      key: "saveToDraft",
      label: "Save as draft",
      type: "boolean",
      advanced: true,
      hint: "Turns a scheduled post back into a draft. It will not publish until scheduled again.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", advanced: true, hint: "Comma-separated." },
    ...assetParams(true),
    metadataParam,
    { key: "aiAssisted", label: "AI assisted", type: "boolean", advanced: true },
  ],
  output: [
    ...postOutput.map((f) => ({ ...f, key: `post.${f.key}` })),
  ],

  execute(input, ctx) {
    return new BufferClient(ctx).mutate(
      EDIT_POST,
      {
        input: compact({
          id: input.postId,
          text: unset(input.text),
          mode: unset(input.mode),
          schedulingType: unset(input.schedulingType),
          dueAt: unset(input.dueAt),
          saveToDraft: input.saveToDraft === undefined ? undefined : input.saveToDraft,
          aiAssisted: input.aiAssisted === undefined ? undefined : input.aiAssisted,
          tagIds: idList(input.tagIds),
          // `buildAssets` returns undefined when nothing was supplied, which is
          // exactly Buffer's "preserve the existing list". An explicit `[]` in
          // the raw Assets field survives, which is exactly its "clear them".
          assets: buildAssets(input),
          metadata: buildMetadata(input.metadata),
        }),
      },
      "editPost",
      ["PostActionSuccess"],
    );
  },
};

export default postEdit;
