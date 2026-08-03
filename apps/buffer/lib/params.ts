import type { Option, OutputField, Param } from "@w6w/types";
import { idList, jsonObject } from "./client.ts";

/**
 * Shared params, enum vocabularies, GraphQL fragments and output shapes.
 *
 * ## Where the enum values come from — and why not from the docs
 *
 * Buffer's published API reference (`developers.buffer.com/reference.html`)
 * lists every enum *type* — `PostStatus`, `ShareMode`, `SchedulingType`,
 * `Service` — with a description, and renders **none of their members**. The
 * page's type cards are literally empty for enums, the docs bundle
 * (`scripts/main.db20617a.js`, 45,830 B) fetches only `search-index.json`, and
 * there is no `schema.json` / `schema.graphql` / introspection document served
 * anywhere on the docs host (all four 404, checked 2026-08-03). Live
 * introspection is not an option either: `api.buffer.com` rejects at the auth
 * layer before validation, so an unauthenticated `{ __schema { … } }` returns
 * the same `UNAUTHENTICATED` 401 as everything else.
 *
 * Guessing was therefore the only alternative to finding a primary source, and
 * guessing an enum member is exactly how an app ships a select box that always
 * 400s. The source used instead is **Buffer's own published CLI**,
 * `@bufferapp/cli@1.2.0` on npm (`git+https://github.com/bufferapp/buffer-mono`,
 * `services/cli`), whose bundle ships generated-from-schema command metadata
 * under `built/*.mjs` — files whose first line is
 * `// src/generated/command-details/<operation>.ts`. Each flag carries its
 * `graphqlTypeName` and, for enums, an explicit `enumValues` array; nested
 * inputs carry a `jsonInputSchema` with JSON-Schema `enum` lists.
 *
 * Every vocabulary below is transcribed from that generator output, and every
 * one of them is *consistent with* the values Buffer's own hand-written
 * examples use (`mode: addToQueue`, `mode: customScheduled`,
 * `schedulingType: automatic`, `status: [scheduled]`, `status: [sent]`,
 * `field: dueAt`, `field: createdAt`, `direction: asc`, `direction: desc`).
 * Where an example exists it agrees with the generator; the generator supplies
 * the members no example happens to use.
 *
 * ```
 * ShareMode        addToQueue · shareNow · shareNext · customScheduled
 * SchedulingType   automatic · notification
 * PostStatus       draft · needs_approval · scheduled · sending · sent · error
 * PostSortableKey  dueAt · createdAt
 * SortDirection    asc · desc
 * DateTimePresence present · absent
 * Product          analyze · engage · publish · buffer · startPage · comments
 * Service          instagram · facebook · twitter · linkedin · pinterest ·
 *                  tiktok · googlebusiness · startPage · mastodon · youtube ·
 *                  threads · bluesky
 * MediaType        image · gif · video · link · document · unsupported
 * IdeaGroupMembership  ungrouped · grouped
 * ```
 *
 * Two of these are deliberately NOT rendered as a `select` anywhere in this
 * app — see `SERVICE_VALUES` and `MEDIA_TYPE_VALUES` below for why.
 */

/* ------------------------------------------------------------------ *
 * Vocabularies
 * ------------------------------------------------------------------ */

/** Build `Option[]` from bare enum members, with an optional description map. */
export function optionsFrom(
  values: readonly string[],
  labels: Record<string, string> = {},
  descriptions: Record<string, string> = {},
): Option[] {
  return values.map((value) => ({
    value,
    label: labels[value] ?? value,
    ...(descriptions[value] ? { description: descriptions[value] } : {}),
  }));
}

/** `ShareMode` — how a post enters the schedule. Required by `createPost`. */
export const SHARE_MODE_VALUES = [
  "addToQueue",
  "shareNow",
  "shareNext",
  "customScheduled",
] as const;

export const shareModeOptions = optionsFrom(
  SHARE_MODE_VALUES,
  {
    addToQueue: "Add to queue",
    shareNow: "Share now",
    shareNext: "Share next",
    customScheduled: "Custom scheduled time",
  },
  {
    addToQueue: "Next free slot in the channel's posting schedule.",
    shareNow: "Publish immediately.",
    shareNext: "Jump to the front of the queue.",
    customScheduled: "Publish at the exact time given in `dueAt`.",
  },
);

/** `SchedulingType` — automatic publishing vs. a reminder to post by hand. */
export const SCHEDULING_TYPE_VALUES = ["automatic", "notification"] as const;

export const schedulingTypeOptions = optionsFrom(
  SCHEDULING_TYPE_VALUES,
  { automatic: "Automatic", notification: "Notification (reminder)" },
  {
    automatic: "Buffer publishes the post itself.",
    notification: "Buffer sends a reminder and you publish by hand — the only " +
      "route for post types a network will not accept via API.",
  },
);

/** `PostStatus` — the post lifecycle, as used by the `posts` filter. */
export const POST_STATUS_VALUES = [
  "draft",
  "needs_approval",
  "scheduled",
  "sending",
  "sent",
  "error",
] as const;

export const postStatusOptions = optionsFrom(POST_STATUS_VALUES, {
  draft: "Draft",
  needs_approval: "Needs approval",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  error: "Error",
});

/** `PostSortableKey` and `SortDirection`. */
export const POST_SORT_FIELD_VALUES = ["dueAt", "createdAt"] as const;
export const SORT_DIRECTION_VALUES = ["asc", "desc"] as const;

export const postSortFieldOptions = optionsFrom(POST_SORT_FIELD_VALUES, {
  dueAt: "Scheduled time (dueAt)",
  createdAt: "Creation time (createdAt)",
});

export const sortDirectionOptions = optionsFrom(SORT_DIRECTION_VALUES, {
  asc: "Ascending",
  desc: "Descending",
});

/** `DateTimePresence` — "has a scheduled time" vs. "has none". */
export const DUE_AT_PRESENCE_VALUES = ["present", "absent"] as const;

export const dueAtPresenceOptions = optionsFrom(DUE_AT_PRESENCE_VALUES, {
  present: "Has a scheduled time",
  absent: "Has no scheduled time",
});

/** `Product` — which Buffer product a channel is filtered against. */
export const PRODUCT_VALUES = [
  "analyze",
  "engage",
  "publish",
  "buffer",
  "startPage",
  "comments",
] as const;

export const productOptions = optionsFrom(PRODUCT_VALUES);

/** `IdeaGroupMembership`. */
export const IDEA_MEMBERSHIP_VALUES = ["ungrouped", "grouped"] as const;

export const ideaMembershipOptions = optionsFrom(IDEA_MEMBERSHIP_VALUES, {
  ungrouped: "Ungrouped ideas only",
  grouped: "Grouped ideas only",
});

/**
 * `Service` — the networks Buffer connects.
 *
 * Recorded here because it is the vocabulary `Channel.service` reports in and
 * `IdeaContentInput.services` accepts, but **not** offered as a `select`
 * anywhere: no action in this app takes a service as an input. Channels are
 * addressed by id, and the id already fixes the network. A service filter that
 * looked like it narrowed `channel-list` would be a lie — `ChannelsFiltersInput`
 * has exactly two fields, `isLocked` and `product`, and no service filter
 * exists to build one on.
 *
 * Buffer's prose list of postable platforms (`guides/posts-and-scheduling.html`)
 * is one entry shorter than this: it names Instagram, Threads, LinkedIn, X,
 * Facebook, Google Business Profiles, Mastodon, YouTube, Pinterest and Bluesky,
 * omitting TikTok and Start Page. Both are real `Service` members per the
 * generator; TikTok channels are reminder-published rather than auto-published,
 * which is the likeliest reason they are absent from a list of platforms
 * Buffer can "create posts for".
 */
export const SERVICE_VALUES = [
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "pinterest",
  "tiktok",
  "googlebusiness",
  "startPage",
  "mastodon",
  "youtube",
  "threads",
  "bluesky",
] as const;

/**
 * `MediaType` — for `IdeaMediaInput.type`.
 *
 * Not a `select` either, and for a sharper reason: Buffer's own field
 * description says *"'video' is not supported via public API"*, so four of the
 * six members are usable, one is documented-broken and one (`unsupported`) is a
 * sentinel. `idea-create` takes media as pass-through JSON rather than
 * pretending this is a clean six-way choice.
 */
export const MEDIA_TYPE_VALUES = [
  "image",
  "gif",
  "video",
  "link",
  "document",
  "unsupported",
] as const;

/* ------------------------------------------------------------------ *
 * Shared params
 * ------------------------------------------------------------------ */

/**
 * The organization id, required by nearly everything.
 *
 * Buffer's data model is `Account → Organizations → Channels → Posts`, and
 * *"You'll need an organization ID for most operations"* — there is no implicit
 * "current" organization on the API even for the overwhelmingly common
 * single-organization account. `organization-list` is the action that hands one
 * over, which is why every hint points at it by name.
 */
export const organizationIdParam: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  required: true,
  hint: "Run **List Organizations** first — a Buffer API key can see every organization on the " +
    "account, and there is no default.",
};

export const channelIdParam: Param = {
  key: "channelId",
  label: "Channel ID",
  type: "string",
  required: true,
  hint: "A connected social profile. **List Channels** returns the id alongside the network.",
};

/**
 * Relay forward-pagination params.
 *
 * `posts` and `ideas` are the only two connections in the schema, and both take
 * `first`/`after` at the *field* level rather than inside `input` — the CLI's
 * generated operation shells confirm the exact signature:
 * `query Posts($input: PostsInput!, $first: Int, $after: String)`.
 *
 * No default is set on `first`. Buffer's CLI defaults to 25, but that is the
 * CLI's choice, not the API's, and a w6w action that silently capped a listing
 * at 25 would be inventing a limit the vendor does not document.
 */
export const firstParam: Param = {
  key: "first",
  label: "Page size",
  type: "number",
  hint: "How many records to return. Omit for Buffer's own default.",
  validation: { integer: true, min: 1 },
};

export const afterParam: Param = {
  key: "after",
  label: "Cursor",
  type: "string",
  advanced: true,
  hint: "`pageInfo.endCursor` from the previous page. Omit for the first page.",
};

/** Relay `pageInfo` output, shared by the two connection-backed actions. */
export const pageInfoOutput: OutputField[] = [
  { key: "pageInfo.hasNextPage", type: "boolean", label: "Has next page" },
  { key: "pageInfo.hasPreviousPage", type: "boolean", label: "Has previous page" },
  { key: "pageInfo.startCursor", type: "string", label: "Start cursor" },
  { key: "pageInfo.endCursor", type: "string", label: "End cursor" },
];

/* ------------------------------------------------------------------ *
 * GraphQL fragments
 * ------------------------------------------------------------------ */

/**
 * The `Post` selection every post-shaped action shares.
 *
 * Kept deliberately flat. Buffer prices a query by complexity — scalars 1
 * point, objects 2, **multiplied 1.5× per level of nesting**, capped at 175,000
 * — so pulling the whole `channel` object onto every post in a page would cost
 * far more than the two scalars that answer the same question. `channelId` and
 * `channelService` exist precisely for that, and Buffer says so in the field
 * description: *"channel ID (faster than resolving the channnel.id)"* (sic).
 *
 * `metadata` and `metrics` are omitted here and selected only by the actions
 * that are about them: `metadata` is a 12-member union whose expansion is
 * enormous, and `metrics` is documented as *"available for personal workflows
 * and automations only, using a personal API key"* — an OAuth connection would
 * be paying complexity for a field it cannot read.
 */
export const POST_FIELDS = `
    id
    text
    status
    dueAt
    sentAt
    createdAt
    updatedAt
    channelId
    channelService
    shareMode
    schedulingType
    isCustomScheduled
    externalLink
    via
    assets { id mimeType source thumbnail }
    error { message supportUrl }
`;

export const postOutput: OutputField[] = [
  { key: "id", type: "string", label: "Post ID" },
  { key: "text", type: "string", label: "Text" },
  { key: "status", type: "string", label: "Status" },
  { key: "dueAt", type: "string", label: "Scheduled for" },
  { key: "sentAt", type: "string", label: "Sent at" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
  { key: "channelId", type: "string", label: "Channel ID" },
  { key: "channelService", type: "string", label: "Network" },
  { key: "shareMode", type: "string", label: "Share mode" },
  { key: "schedulingType", type: "string", label: "Scheduling type" },
  { key: "isCustomScheduled", type: "boolean", label: "Custom scheduled" },
  { key: "externalLink", type: "string", label: "URL on the network" },
  { key: "via", type: "string", label: "Created via" },
  { key: "assets", type: "array", label: "Assets" },
  { key: "error", type: "object", label: "Publishing error" },
];

/**
 * The union tail every mutation ends with.
 *
 * Buffer: *"Always include `... on MutationError` in every mutation. This
 * catches current and future error types."* `__typename` rides along because
 * `unwrapMutation` switches on it — without it a failure arm and a success arm
 * are indistinguishable objects.
 */
export const MUTATION_ERROR_TAIL = `
    __typename
    ... on RestProxyError { message link code }
    ... on MutationError { message }
`;

/** The `Channel` selection shared by `channel-list` and `channel-get`. */
export const CHANNEL_FIELDS = `
    id
    name
    displayName
    descriptor
    service
    serviceId
    type
    avatar
    externalLink
    timezone
    organizationId
    isDisconnected
    isLocked
    isQueuePaused
    createdAt
    updatedAt
`;

export const channelOutput: OutputField[] = [
  { key: "id", type: "string", label: "Channel ID" },
  { key: "name", type: "string", label: "Handle" },
  { key: "displayName", type: "string", label: "Display name" },
  { key: "descriptor", type: "string", label: "Descriptor" },
  { key: "service", type: "string", label: "Network" },
  { key: "serviceId", type: "string", label: "Network-side ID" },
  { key: "type", type: "string", label: "Channel type" },
  { key: "avatar", type: "string", label: "Avatar URL" },
  { key: "externalLink", type: "string", label: "Profile URL" },
  { key: "timezone", type: "string", label: "Timezone" },
  { key: "organizationId", type: "string", label: "Organization ID" },
  { key: "isDisconnected", type: "boolean", label: "Disconnected" },
  { key: "isLocked", type: "boolean", label: "Locked" },
  { key: "isQueuePaused", type: "boolean", label: "Queue paused" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

/* ------------------------------------------------------------------ *
 * Asset construction
 * ------------------------------------------------------------------ */

/**
 * Build the `assets` array from the flat URL params `post-create` / `post-edit`
 * expose.
 *
 * `AssetInput` is a four-way tagged input — *"A single entity's asset. Exactly
 * one variant must be provided"* — over `image`, `video`, `link` and
 * `document`. Rather than make a workflow author hand-assemble that, the two
 * post actions take `imageUrls` (comma-separated, one asset each, order
 * preserved), `videoUrl`, and a `linkUrl` + optional title/description trio.
 *
 * Order is images → video → link, which is the order they are listed in, and
 * Buffer describes `assets` as an *"Ordered list of assets on this post"*.
 *
 * Two things this deliberately does not do:
 *
 *  - **No upload.** Buffer hosts media by *pulling a URL you supply* — there is
 *    no multipart endpoint in the schema and `hosting-media` describes handing
 *    over a public URL. So an asset is a URL, full stop, and nothing here needs
 *    egress to a second host.
 *  - **No `document`.** `DocumentAssetInput` requires `url` *and* `title` and
 *    is only meaningful on LinkedIn/Facebook document posts; it is reachable
 *    through the `assets` escape hatch on both actions rather than given two
 *    more top-level fields that are inert on ten of twelve networks.
 */
export interface AssetParams {
  imageUrls?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  assets?: unknown;
}

export function buildAssets(input: AssetParams): Record<string, unknown>[] | undefined {
  const explicit = input.assets;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const parsed = typeof explicit === "string" ? tryParseArray(explicit) : explicit;
    if (!Array.isArray(parsed)) {
      throw new Error("Assets must be a JSON array of AssetInput objects");
    }
    return parsed as Record<string, unknown>[];
  }

  const out: Record<string, unknown>[] = [];
  for (const url of idList(input.imageUrls) ?? []) out.push({ image: { url } });
  if (input.videoUrl) out.push({ video: { url: input.videoUrl } });
  if (input.linkUrl) {
    out.push({
      link: {
        url: input.linkUrl,
        ...(input.linkTitle ? { title: input.linkTitle } : {}),
        ...(input.linkDescription ? { description: input.linkDescription } : {}),
      },
    });
  }
  return out.length ? out : undefined;
}

function tryParseArray(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    throw new Error("Assets is not valid JSON");
  }
}

/** The shared asset params, so `post-create` and `post-edit` cannot drift. */
export function assetParams(editing: boolean): Param[] {
  return [
    {
      key: "imageUrls",
      label: "Image URLs",
      type: "string",
      hint: "Comma-separated public image URLs. Buffer fetches each one — there is no upload " +
        "endpoint. One asset per URL, in the order given.",
    },
    { key: "videoUrl", label: "Video URL", type: "string", advanced: true },
    {
      key: "linkUrl",
      label: "Link URL",
      type: "string",
      advanced: true,
      hint: "Attaches a link card. Mutually exclusive with a network `linkAttachment` in " +
        "**Network metadata** — Buffer rejects input that supplies both.",
    },
    { key: "linkTitle", label: "Link title", type: "string", advanced: true },
    { key: "linkDescription", label: "Link description", type: "string", advanced: true },
    {
      key: "assets",
      label: "Assets (raw)",
      type: "json",
      advanced: true,
      hint: "Escape hatch: a raw `[AssetInput!]` array, for `document` assets, Instagram user " +
        "tags or image alt text. **Overrides** the fields above when set." +
        (editing ? " Omit to keep the post's existing assets; pass `[]` to clear them." : ""),
    },
  ];
}

/** Shared `metadata` param — the per-network configuration blob. */
export const metadataParam: Param = {
  key: "metadata",
  label: "Network metadata",
  type: "json",
  advanced: true,
  hint: '`PostInputMetaData`, keyed by network — e.g. `{"linkedin":{"firstComment":"…"}}`, ' +
    '`{"twitter":{"thread":[{"text":"…"}]}}`, `{"instagram":{"type":"reel"}}`. ' +
    "Only the key matching the channel's own network is read. See the API reference for the " +
    "shape of each; this is passed through unchanged.",
};

export function buildMetadata(v: unknown): Record<string, unknown> | undefined {
  return jsonObject(v, "Network metadata");
}
