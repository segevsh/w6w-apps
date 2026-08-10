import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList, unset } from "../lib/client.ts";
import {
  assetParams,
  buildAssets,
  buildMetadata,
  channelIdParam,
  metadataParam,
  MUTATION_ERROR_TAIL,
  POST_FIELDS,
  postOutput,
  schedulingTypeOptions,
  shareModeOptions,
} from "../lib/params.ts";

/**
 * `mutation createPost(input: CreatePostInput!)` — the action this app exists
 * for.
 *
 * ## One post, one channel
 *
 * This is the sharpest break from Buffer's legacy REST API, and it is
 * deliberate on Buffer's part: the old `/updates/create` took a list of profile
 * ids and fanned out; `createPost` takes exactly one `channelId`. Posting the
 * same copy to five channels is five calls — which in a workflow is a loop, not
 * a parameter. Buffer lists "single-channel post creation" among the structural
 * changes in its migration notes.
 *
 * ## The two required knobs, and why `mode` is the interesting one
 *
 * `schedulingType` says *who publishes*: `automatic` (Buffer does) or
 * `notification` (Buffer reminds you and you do). `mode` says *when*:
 *
 *   | `mode`            | Effect                                                    |
 *   | ----------------- | --------------------------------------------------------- |
 *   | `addToQueue`      | Next free slot in the channel's posting schedule           |
 *   | `shareNext`       | Front of the queue                                        |
 *   | `shareNow`        | Immediately                                               |
 *   | `customScheduled` | At `dueAt` — Buffer's examples use ISO 8601 UTC            |
 *
 * `dueAt` without `mode: customScheduled` does **not** schedule the post: with
 * `addToQueue` Buffer picks the slot and the time you passed is ignored. The
 * hints on both fields name the other, because this is the failure that looks
 * like it worked.
 *
 * A second silent one: `mode: addToQueue` against a channel whose queue is
 * paused succeeds and then never publishes — `Channel.isQueuePaused` says
 * *"scheduled posts won't be published"*. `channel-list` returns that flag.
 *
 * ## Drafts and approvals
 *
 * `saveToDraft: true` parks the post instead of scheduling it, and Buffer notes
 * that on a draft *"Posting limits are not checked"* — so a draft cannot fail
 * on the daily cap. `needsApproval: true` submits it for review instead, and
 * Buffer is explicit that the two interact: *"A post submitted for approval is
 * always a draft, so this conflicts with turning `saveToDraft` off"*, and it is
 * *"Only valid when your posting policy on the target channel requires
 * approval"*. Both are exposed, both hinted, and neither is inferred from the
 * other — guessing which one a user meant is how a post silently goes live.
 *
 * ## Assets are URLs Buffer pulls, not uploads
 *
 * There is no multipart endpoint in this schema. `AssetInput` is a four-way
 * choice — image, video, link, document — each taking a public `url` that
 * Buffer fetches. That is why this action needs no second host in
 * `network.allow`: nothing here uploads anything anywhere. `lib/params.ts`
 * documents how the flat `imageUrls` / `videoUrl` / `linkUrl` fields become the
 * array, and the raw `assets` escape hatch is there for the shapes those three
 * cannot express (documents, Instagram user tags, image alt text).
 *
 * One rejection to know about, quoted from `CreatePostInput` itself:
 * *"`metadata.{service}.linkAttachment` is mutually exclusive with a non-empty
 * `assets` array. Input providing both is rejected."*
 *
 * ## Per-network configuration is pass-through, on purpose
 *
 * `PostInputMetaData` is keyed by network — `instagram`, `facebook`,
 * `linkedin`, `twitter`, `pinterest`, `google`, `youtube`, `mastodon`,
 * `threads`, `bluesky`, `tiktok` — and each arm has its own shape: a LinkedIn
 * `firstComment`, an X `thread` array, an Instagram `type: reel` with sticker
 * fields and geolocation, a Google Business `detailsOffer` with a start and end
 * date and a call-to-action button. Roughly a hundred and fifty fields across
 * the eleven.
 *
 * Flattening that into params would produce an action with a hundred inputs of
 * which ninety are inert for any given channel — and it would go stale the
 * first time Buffer adds a network. So `metadata` is a JSON param passed
 * through unchanged, with the reference cited on it. The trade is stated rather
 * than hidden: this is the one place in the app where a user has to read
 * Buffer's docs to use a field.
 *
 * ## Failure arrives with HTTP 200
 *
 * `createPost` returns a `PostActionPayload` union whose members include
 * `InvalidInputError`, `LimitReachedError`, `NotFoundError`, `UnauthorizedError`,
 * `UnexpectedError` and `RestProxyError` — all delivered inside `data`, with no
 * `errors` array and a 200 status line. The selection below ends with
 * `... on MutationError { message }` per Buffer's own instruction, and
 * `BufferClient.mutate` throws on any arm that is not `PostActionSuccess`. See
 * `lib/client.ts` for the full three-arm failure model.
 *
 * `RestProxyError` is broken out because it is the one that means *the network*
 * refused, not Buffer — it carries a `link` to Buffer's help article and a
 * `code`, and "Instagram rejected this image" needs a different fix from
 * "Buffer rejected this input".
 *
 * Not idempotent: every call mints a new post and Buffer has no upsert form.
 */
const CREATE_POST = `mutation W6wCreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
${MUTATION_ERROR_TAIL}
    ... on PostActionSuccess {
      post {
${POST_FIELDS}
      }
    }
  }
}`;

interface Input {
  channelId: string;
  text?: string;
  mode: string;
  schedulingType?: string;
  dueAt?: string;
  saveToDraft?: boolean;
  needsApproval?: boolean;
  tagIds?: string;
  imageUrls?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  assets?: unknown;
  metadata?: unknown;
  ideaId?: string;
  aiAssisted?: boolean;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description:
    "Schedule a post on one channel — queued, sent now, or at an exact time. One call is one " +
    "channel; posting the same copy to several means one call each.",
  idempotent: false,
  params: [
    channelIdParam,
    {
      key: "text",
      label: "Text",
      type: "text",
      config: { multiline: true },
      hint: "For a threaded post this must match the first item of the `thread` array in " +
        "**Network metadata**.",
    },
    {
      key: "mode",
      label: "When to publish",
      type: "select",
      required: true,
      options: shareModeOptions,
      default: "addToQueue",
      hint: "`Custom scheduled time` is the only mode that reads **Scheduled for** — with the " +
        "others Buffer picks the slot and any time you set is ignored.",
    },
    {
      key: "schedulingType",
      label: "Publishing",
      type: "select",
      options: schedulingTypeOptions,
      default: "automatic",
      hint: "`notification` sends you a reminder to post by hand instead of publishing — the " +
        "only route for post types a network will not accept via API.",
    },
    {
      key: "dueAt",
      label: "Scheduled for",
      type: "datetime",
      hint: "ISO 8601 UTC, e.g. `2026-03-10T15:00:00.000Z`. Only read when **When to publish** " +
        "is `Custom scheduled time`.",
    },
    {
      key: "saveToDraft",
      label: "Save as draft",
      type: "boolean",
      hint: "Parks the post instead of scheduling it. Buffer skips the posting-limit check on " +
        "drafts.",
    },
    {
      key: "needsApproval",
      label: "Submit for approval",
      type: "boolean",
      advanced: true,
      hint: "Only valid where the channel's posting policy requires approval. A post submitted " +
        "for approval is always a draft, so Buffer rejects this alongside **Save as draft** " +
        "turned off.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", advanced: true, hint: "Comma-separated." },
    ...assetParams(false),
    metadataParam,
    {
      key: "ideaId",
      label: "From idea ID",
      type: "string",
      advanced: true,
      hint: "Links the post back to the idea it came from.",
    },
    {
      key: "aiAssisted",
      label: "AI assisted",
      type: "boolean",
      advanced: true,
      hint: "Flags the post as AI-authored in Buffer's own reporting. Metadata only — it does " +
        "not add a disclosure on the network.",
    },
  ],
  output: [
    ...postOutput.map((f) => ({ ...f, key: `post.${f.key}` })),
  ],

  execute(input, ctx) {
    return new BufferClient(ctx).mutate(
      CREATE_POST,
      {
        input: compact({
          channelId: input.channelId,
          text: unset(input.text),
          mode: input.mode,
          schedulingType: input.schedulingType || "automatic",
          dueAt: unset(input.dueAt),
          // Booleans go out only when set. `needsApproval` is non-null in the
          // schema but carries a server-side default — Buffer's own examples
          // omit it, and sending `false` unasked would fight a channel policy
          // that requires approval.
          saveToDraft: input.saveToDraft === undefined ? undefined : input.saveToDraft,
          needsApproval: input.needsApproval === undefined ? undefined : input.needsApproval,
          aiAssisted: input.aiAssisted === undefined ? undefined : input.aiAssisted,
          tagIds: idList(input.tagIds),
          assets: buildAssets(input),
          metadata: buildMetadata(input.metadata),
          ideaId: unset(input.ideaId),
        }),
      },
      "createPost",
      ["PostActionSuccess"],
    );
  },
};

export default postCreate;
