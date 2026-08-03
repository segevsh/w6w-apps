/**
 * Shared param fragments and output shapes.
 *
 * Every enum, field name and description here is transcribed from Circle's
 * Admin API v2 OpenAPI document
 * (<https://api-headless.circle.so/api/admin/v2/swagger.yaml>, fetched
 * 2026-08-03, 553,625 bytes) or from the prose docs at <https://api.circle.so>.
 * Nothing is recalled: where an enum is reproduced, it is the enum the document
 * declares, not a superset gathered from community posts.
 */
import type { Option, OutputField, Param } from "@w6w/types";

// ------------------------------------------------------------------ params --

/**
 * Circle's pagination, which is uniform across every list endpoint and
 * documented once for all of them: "`page`: … If not provided, it defaults to
 * page 1. `per_page`: … If not specified, it will default to 10 items per page"
 * (`/apis/admin-api`).
 *
 * No default is set on either param. Sending `page=1&per_page=10` explicitly
 * would spend URL space restating the server's own defaults, and a default
 * `per_page` would quietly cap a listing at a number this app chose.
 */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "1-based. Circle defaults to page 1.",
  validation: { integer: true, min: 1 },
};

export const perPageParam: Param = {
  key: "perPage",
  label: "Per page",
  type: "number",
  hint: "Circle defaults to 10. The response carries `has_next_page` — honour it rather than " +
    "walking past the end, since 4xx responses count against the monthly allowance.",
  validation: { integer: true, min: 1 },
};

/** `GET /community_members` — the `status` enum, with Circle's own gloss. */
export const memberStatusOptions: Option[] = [
  {
    value: "active",
    label: "Active",
    description: "Completed profile setup (`profile_confirmed_at` is set). Circle's default.",
  },
  { value: "inactive", label: "Inactive", description: "Invited but never confirmed a profile." },
  { value: "all", label: "All", description: "Both." },
];

/** `GET /space_members` — the `status` enum. Same words, different default. */
export const spaceMemberStatusOptions: Option[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All", description: "Circle's default here — unlike the member list." },
];

/** `GET /posts` — the `status` enum. */
export const postStatusOptions: Option[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "all", label: "All" },
];

/** `POST /posts` — the `status` enum. Narrower than the filter's: no `all`. */
export const postWriteStatusOptions: Option[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Needs a future `published_at`.",
  },
];

/** `GET /posts` — the `sort` enum. */
export const postSortOptions: Option[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "likes", label: "Likes" },
  { value: "latest_updated", label: "Latest updated" },
  { value: "oldest_updated", label: "Oldest updated" },
];

/** `GET /spaces` — the `sort` enum. Shares no values with the post one. */
export const spaceSortOptions: Option[] = [
  { value: "active", label: "Active" },
  { value: "oldest", label: "Oldest" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "likes", label: "Likes" },
  { value: "latest_updated", label: "Latest updated" },
  { value: "oldest_updated", label: "Oldest updated" },
  { value: "latest_profile_confirmed", label: "Latest profile confirmed" },
];

/** `POST /spaces` — the `space_type` enum. Decides which content the space holds. */
export const spaceTypeOptions: Option[] = [
  { value: "basic", label: "Posts", description: "Discussion posts. Circle's default." },
  { value: "event", label: "Events" },
  { value: "course", label: "Course" },
  { value: "chat", label: "Chat" },
  { value: "image", label: "Images" },
  { value: "members", label: "Members directory" },
];

/** `GET /events` — the `sort` enum, glossed exactly as the parameter describes it. */
export const eventSortOptions: Option[] = [
  { value: "start_date", label: "Start date, ascending", description: "By `starts_at`." },
  { value: "start_date_desc", label: "Start date, descending" },
  { value: "oldest", label: "Oldest created", description: "By `created_at`." },
];

/** `GET /advanced_search` — the `type` enum. */
export const searchTypeOptions: Option[] = [
  { value: "general", label: "Everything" },
  { value: "posts", label: "Posts" },
  { value: "comments", label: "Comments" },
  { value: "members", label: "Members" },
  { value: "spaces", label: "Spaces" },
  { value: "lessons", label: "Course lessons" },
  { value: "events", label: "Events" },
  { value: "entity_list", label: "Entity list" },
  { value: "mentions", label: "Mentions" },
];

/** `GET /member_tags`, `GET /topics` — the shared `sort` enum. */
export const nameSortOptions: Option[] = [
  { value: "oldest", label: "Oldest", description: "Circle's default." },
  { value: "newest", label: "Newest" },
  { value: "alphabetical", label: "A→Z" },
  { value: "alphabetical_desc", label: "Z→A" },
];

/**
 * The plain-text half of a rich body. See `lib/tiptap.ts` for why the API
 * cannot simply be handed a string.
 */
export const bodyTextParam: Param = {
  key: "text",
  label: "Body",
  type: "text",
  config: { multiline: true },
  hint: "Plain text. Blank lines become paragraphs, single newlines become line breaks. " +
    "For headings, lists, mentions or embeds use the JSON document instead.",
};

/** The raw-document half. Advanced, because most bodies are just text. */
export const bodyJsonParam: Param = {
  key: "bodyJson",
  label: "Body (TipTap JSON)",
  type: "json",
  advanced: true,
  hint: 'A TipTap document — `{"type":"doc","content":[…]}` or an already-wrapped ' +
    '`{"body":{…}}`. Mutually exclusive with the plain-text body. Mentions need a member ' +
    "`sgid` and attachments need a `signed_id` from Circle's direct-upload endpoint; neither " +
    "can be derived here.",
};

/** The `skip_notifications` flag several write endpoints share. */
export const skipNotificationsParam: Param = {
  key: "skipNotifications",
  label: "Skip notifications",
  type: "boolean",
  advanced: true,
  hint: "Write the record without notifying followers. Useful for migrations and backfills.",
};

/**
 * The space selector. An integer id, never a slug — every v2 parameter named
 * `space_id` is typed `integer`. `space-list` is how you find the number.
 */
export function spaceIdParam(required: boolean, hint?: string): Param {
  return {
    key: "spaceId",
    label: "Space ID",
    type: "number",
    required,
    hint: hint ?? "Numeric id, not a slug. `space-list` returns them.",
    validation: { integer: true },
  };
}

/**
 * A comma-separated integer list, rendered as a plain string.
 *
 * Circle's array parameters (`space_ids`, `member_tag_ids`, `topics`) are
 * `array` of `integer`. They are collected as text and parsed by
 * `lib/client.ts#idList` so that one call can do the work of several — which is
 * Circle's own advice, and matters because every request is metered.
 */
export function idListParam(key: string, label: string, hint: string): Param {
  return {
    key,
    label,
    type: "string",
    advanced: true,
    placeholder: "12, 34, 56",
    hint,
    validation: { pattern: "^\\s*\\d+(\\s*,\\s*\\d+)*\\s*$" },
  };
}

// ----------------------------------------------------------------- outputs --

/**
 * The pagination envelope every v2 list endpoint returns, identically —
 * `posts_list`, `comments_list`, `community_member_list`, `spaces`,
 * `space_groups`, `event_list`, `member_tags_list`, `tagged_members`,
 * `advanced_search_results` and `event_attendees_list` all declare exactly
 * these six keys.
 */
export const listOutput: OutputField[] = [
  { key: "page", type: "number", label: "Page" },
  { key: "per_page", type: "number", label: "Per page" },
  { key: "has_next_page", type: "boolean", label: "Has next page" },
  { key: "count", type: "number", label: "Total records" },
  { key: "page_count", type: "number", label: "Total pages" },
  { key: "records", type: "array", label: "Records" },
];

/** The `community_member` schema. */
export const memberOutput: OutputField[] = [
  { key: "id", type: "number", label: "Member ID" },
  { key: "user_id", type: "number", label: "User ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "first_name", type: "string", label: "First name" },
  { key: "last_name", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "headline", type: "string", label: "Headline" },
  { key: "avatar_url", type: "string", label: "Avatar URL" },
  { key: "profile_url", type: "string", label: "Profile URL" },
  { key: "public_uid", type: "string", label: "Public UID" },
  { key: "community_id", type: "number", label: "Community ID" },
  { key: "active", type: "boolean", label: "Active" },
  { key: "accepted_invitation", type: "boolean", label: "Accepted invitation" },
  { key: "profile_confirmed_at", type: "string", label: "Profile confirmed at" },
  { key: "member_since", type: "string", label: "Member since" },
  { key: "last_seen_at", type: "string", label: "Last seen at" },
  { key: "posts_count", type: "number", label: "Posts" },
  { key: "comments_count", type: "number", label: "Comments" },
  { key: "member_tags", type: "array", label: "Member tags" },
  { key: "profile_fields", type: "array", label: "Profile fields" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `space` schema. */
export const spaceOutput: OutputField[] = [
  { key: "id", type: "number", label: "Space ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "url", type: "string", label: "URL" },
  { key: "space_type", type: "string", label: "Space type" },
  { key: "community_id", type: "number", label: "Community ID" },
  { key: "space_group", type: "object", label: "Space group" },
  { key: "is_private", type: "boolean", label: "Private" },
  { key: "is_hidden", type: "boolean", label: "Hidden" },
  { key: "is_hidden_from_non_members", type: "boolean", label: "Hidden from non-members" },
  { key: "is_post_disabled", type: "boolean", label: "Posting disabled" },
  { key: "emoji", type: "string", label: "Emoji" },
  { key: "topics", type: "array", label: "Topics" },
  { key: "display_view", type: "string", label: "Display view" },
  { key: "default_sort", type: "string", label: "Default sort" },
];

/** The `space_group` schema. */
export const spaceGroupOutput: OutputField[] = [
  { key: "id", type: "number", label: "Space group ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "community_id", type: "number", label: "Community ID" },
  { key: "spaces_count", type: "number", label: "Spaces" },
  { key: "space_group_members_count", type: "number", label: "Members" },
  { key: "is_hidden_from_non_members", type: "boolean", label: "Hidden from non-members" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `space_member` schema. */
export const spaceMemberOutput: OutputField[] = [
  { key: "id", type: "number", label: "Space member ID" },
  { key: "space_id", type: "number", label: "Space ID" },
  { key: "user_id", type: "number", label: "User ID" },
  { key: "community_member_id", type: "number", label: "Community member ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "access_type", type: "string", label: "Access type" },
  { key: "moderator", type: "boolean", label: "Moderator" },
  { key: "notification_type", type: "string", label: "Notification type" },
  { key: "community_member", type: "object", label: "Community member" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `basic_post` schema — what every post endpoint returns, nested or not. */
export const postOutput: OutputField[] = [
  { key: "id", type: "number", label: "Post ID" },
  { key: "name", type: "string", label: "Title" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "url", type: "string", label: "URL" },
  { key: "status", type: "string", label: "Status" },
  { key: "body", type: "object", label: "Rendered body" },
  { key: "tiptap_body", type: "object", label: "TipTap body" },
  { key: "space_id", type: "number", label: "Space ID" },
  { key: "space_name", type: "string", label: "Space name" },
  { key: "space_slug", type: "string", label: "Space slug" },
  { key: "user_id", type: "number", label: "Author user ID" },
  { key: "user_name", type: "string", label: "Author name" },
  { key: "user_email", type: "string", label: "Author email" },
  { key: "comments_count", type: "number", label: "Comments" },
  { key: "likes_count", type: "number", label: "Likes" },
  { key: "topics", type: "array", label: "Topics" },
  { key: "is_comments_enabled", type: "boolean", label: "Comments enabled" },
  { key: "is_comments_closed", type: "boolean", label: "Comments closed" },
  { key: "is_liking_enabled", type: "boolean", label: "Liking enabled" },
  { key: "published_at", type: "string", label: "Published at" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The `comment` schema. */
export const commentOutput: OutputField[] = [
  { key: "id", type: "number", label: "Comment ID" },
  { key: "body", type: "object", label: "Body" },
  { key: "url", type: "string", label: "URL" },
  { key: "parent_comment_id", type: "number", label: "Parent comment ID" },
  { key: "replies_count", type: "number", label: "Replies" },
  { key: "likes_count", type: "number", label: "Likes" },
  { key: "user", type: "object", label: "Author" },
  { key: "post", type: "object", label: "Post" },
  { key: "space", type: "object", label: "Space" },
  { key: "community_id", type: "number", label: "Community ID" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `event` schema. */
export const eventOutput: OutputField[] = [
  { key: "id", type: "number", label: "Event ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "url", type: "string", label: "URL" },
  { key: "body", type: "object", label: "Body" },
  { key: "starts_at", type: "string", label: "Starts at" },
  { key: "ends_at", type: "string", label: "Ends at" },
  { key: "duration_in_seconds", type: "number", label: "Duration (seconds)" },
  { key: "location_type", type: "string", label: "Location type" },
  { key: "virtual_location_url", type: "string", label: "Virtual location URL" },
  { key: "in_person_location", type: "string", label: "In-person location" },
  { key: "host", type: "string", label: "Host" },
  { key: "space", type: "object", label: "Space" },
  { key: "member_email", type: "string", label: "Creator email" },
  { key: "member_name", type: "string", label: "Creator name" },
  { key: "comments_count", type: "number", label: "Comments" },
  { key: "likes_count", type: "number", label: "Likes" },
  { key: "rsvp_disabled", type: "boolean", label: "RSVP disabled" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `event_attendee` schema. */
export const eventAttendeeOutput: OutputField[] = [
  { key: "id", type: "number", label: "Attendee ID" },
  { key: "event_id", type: "number", label: "Event ID" },
  { key: "event_name", type: "string", label: "Event name" },
  { key: "member_name", type: "string", label: "Member name" },
  { key: "member_email", type: "string", label: "Member email" },
  { key: "member_avatar_url", type: "string", label: "Member avatar URL" },
  { key: "headline", type: "string", label: "Headline" },
  { key: "rsvp_date", type: "string", label: "RSVP date" },
];

/** The `member_tag` schema. */
export const memberTagOutput: OutputField[] = [
  { key: "id", type: "number", label: "Tag ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "color", type: "string", label: "Colour" },
  { key: "emoji", type: "string", label: "Emoji" },
  { key: "display_format", type: "string", label: "Display format" },
  { key: "is_public", type: "boolean", label: "Public" },
  { key: "is_background_enabled", type: "boolean", label: "Background enabled" },
  { key: "tagged_members_count", type: "number", label: "Tagged members" },
  { key: "display_locations", type: "array", label: "Display locations" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `tagged_member` schema. */
export const taggedMemberOutput: OutputField[] = [
  { key: "id", type: "number", label: "Tagged member ID" },
  { key: "member_tag_id", type: "number", label: "Tag ID" },
  { key: "member_tag_name", type: "string", label: "Tag name" },
  { key: "member_tag_emoji", type: "string", label: "Tag emoji" },
  { key: "user_id", type: "number", label: "User ID" },
  { key: "user_email", type: "string", label: "User email" },
  { key: "community_member_id", type: "number", label: "Community member ID" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `community` schema. */
export const communityOutput: OutputField[] = [
  { key: "id", type: "number", label: "Community ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "locale", type: "string", label: "Locale" },
  { key: "is_private", type: "boolean", label: "Private" },
  { key: "reply_to_email", type: "string", label: "Reply-to email" },
  { key: "white_label", type: "boolean", label: "White label" },
  { key: "weekly_digest_enabled", type: "boolean", label: "Weekly digest enabled" },
  { key: "default_new_member_space_id", type: "number", label: "Default new-member space ID" },
  { key: "prefs", type: "object", label: "Preferences" },
  { key: "community_setting", type: "object", label: "Community setting" },
  { key: "created_at", type: "string", label: "Created at" },
];

/**
 * The `{ success, message }` acknowledgement Circle's simpler writes return.
 * Its own `error` schema shares those two keys, which is why the client checks
 * the HTTP status rather than the `success` flag.
 */
export const acknowledgementOutput: OutputField[] = [
  { key: "success", type: "boolean", label: "Success" },
  { key: "message", type: "string", label: "Message" },
];
