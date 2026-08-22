import type { ActionDefinition } from "@w6w/types";
import { compact, csv, deriveIdempotencyKey, MastodonClient } from "../lib/client.ts";

/**
 * `POST /api/v1/statuses` — post.
 *
 * ## The length limit belongs to the instance, not to Mastodon
 *
 * 500 is the default and a great many servers raise it. This checks against the
 * limit recorded from the connected instance's own `/api/v2/instance`, so a
 * post rejected here would genuinely have been rejected there — rather than
 * against a constant that is wrong for half the network.
 *
 * The count is of **characters as Mastodon counts them**, which is not the same
 * as bytes: a URL counts as 23 characters however long it is, and a mention
 * counts only the username, not the domain. Both are applied below.
 *
 * ## `Idempotency-Key` is real deduplication, and this uses it properly
 *
 * Mastodon deduplicates on that header for a few minutes. Like every such
 * mechanism it only helps if the value is identical across attempts — a fresh
 * UUID is carried by the retry and both posts appear. So the key is derived
 * from the post's own content: same payload, same key, deduplicated.
 *
 * ## `visibility` has four values and one of them is not what it sounds like
 *
 * `public` appears in the public timelines. `unlisted` is public but not in
 * them. `private` is followers-only. **`direct` is not a DM system** — it is a
 * status visible only to the accounts mentioned in it, stored as a status,
 * carrying the same content warning and moderation machinery. It is not
 * encrypted and the instance admins of every recipient can read it.
 */
const action: ActionDefinition = {
  key: "status-post",
  type: "perform",
  resource: "status",
  title: "Post a status",
  description:
    "Post to the connected instance. The length limit is that INSTANCE'S, not Mastodon's, and a " +
    "retry deduplicates because the idempotency key is derived from the content.",
  idempotent: true,
  params: [
    {
      key: "status",
      label: "Text",
      type: "text",
      required: true,
      default: "",
      hint: "URLs count as 23 characters whatever their length, and a mention counts only the " +
        "username — this checks the way Mastodon does.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "public",
      options: [
        { value: "public", label: "Public — appears in public timelines" },
        { value: "unlisted", label: "Unlisted — public, but not in the timelines" },
        { value: "private", label: "Followers only" },
        { value: "direct", label: "Direct — only accounts mentioned. NOT encrypted" },
      ],
      hint: "`direct` is not a DM system: it is a status limited to whoever is mentioned, " +
        "readable by the admins of every recipient's instance.",
    },
    {
      key: "inReplyToId",
      label: "In Reply To",
      type: "string",
      default: "",
      hint: "A status id. Mastodon works the thread out from it — there is no separate root.",
    },
    {
      key: "spoilerText",
      label: "Content Warning",
      type: "string",
      default: "",
      hint: "Sets a content warning and collapses the post behind it. Expected on many " +
        "instances for anything sensitive, and their rules say which.",
    },
    {
      key: "mediaIds",
      label: "Media",
      type: "string",
      default: "",
      hint: "Comma-separated ids from `media-upload`. The instance's own maximum applies, " +
        "usually four.",
    },
    {
      key: "sensitive",
      label: "Mark Media Sensitive",
      type: "boolean",
      default: false,
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "",
      advanced: true,
      hint: "ISO 639 two-letter. Drives translation offers and per-language filters.",
    },
    {
      key: "scheduledAt",
      label: "Schedule For",
      type: "string",
      default: "",
      advanced: true,
      hint: "ISO 8601, at least five minutes ahead. A scheduled post returns a SCHEDULE id " +
        "rather than a status id — they are different things and the status does not exist yet.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The status id — or a schedule id, when scheduled" },
    { key: "url", type: "string", label: "Its public URL" },
    { key: "scheduled", type: "boolean", label: "Whether this is a schedule rather than a post" },
    { key: "characters", type: "number", label: "Length, counted the way Mastodon counts" },
    { key: "limit", type: "number", label: "This instance's own maximum" },
    { key: "status", type: "object", label: "The created status" },
  ],

  async execute(input, ctx) {
    const client = new MastodonClient(ctx);
    const p = input as Record<string, unknown>;
    const text = String(p.status ?? "");
    const mediaIds = csv(p.mediaIds);
    if (!text.trim() && !mediaIds) {
      throw new Error("`status` is required, unless the post carries media");
    }

    const characters = countCharacters(text);
    const limit = client.maxCharacters;
    if (characters > limit) {
      throw new Error(
        `the post is ${characters} characters and this instance allows ${limit}. That limit is ` +
          "the SERVER'S — the same text may post fine elsewhere. Note URLs count as 23 " +
          "characters however long they are, and a mention counts only the username",
      );
    }

    const scheduledAt = String(p.scheduledAt ?? "").trim();
    const payload = compact({
      status: text,
      visibility: p.visibility ?? "public",
      in_reply_to_id: p.inReplyToId,
      spoiler_text: p.spoilerText,
      media_ids: mediaIds,
      sensitive: p.sensitive === true ? true : undefined,
      language: p.language,
      scheduled_at: scheduledAt || undefined,
    });

    const result = await client.request<{ id?: string; url?: string; scheduled_at?: string }>(
      "/api/v1/statuses",
      {
        method: "POST",
        body: payload,
        // Derived, not generated: a fresh key would let a retry post twice.
        idempotencyKey: await deriveIdempotencyKey(payload),
      },
    );

    // A scheduled post returns a schedule object, not a status — the id is not
    // a status id and the post does not exist yet.
    const scheduled = Boolean(scheduledAt);

    ctx.log("info", "posted to Mastodon", {
      characters,
      limit,
      scheduled,
      visibility: p.visibility ?? "public",
    });

    return {
      id: result?.id,
      url: result?.url,
      scheduled,
      characters,
      limit,
      status: result,
    };
  },
};

/**
 * Count the way Mastodon counts.
 *
 * Two rules, both of which make a post that looks too long fit: every URL
 * counts as **23 characters** regardless of length, and a mention counts only
 * `@username`, not the `@domain` after it.
 */
export function countCharacters(text: string): number {
  let counted = text;
  // Every URL is 23, however long — so a post full of links is much shorter
  // than it looks.
  counted = counted.replace(/https?:\/\/\S+/g, "x".repeat(23));
  // A mention costs only the local part.
  counted = counted.replace(/@([a-z0-9_]+)@[a-z0-9.-]+/gi, "@$1");
  return [...counted].length;
}

export default action;
