/**
 * Shared param fragments and output shapes.
 *
 * Everything here is transcribed from Discourse's OpenAPI document
 * (<https://docs.discourse.org/openapi.json>, fetched 2026-08-03) rather than
 * remembered. Where an enum is reproduced, it is the enum that document
 * declares — not a superset gathered from forum posts.
 */
import type { Option, OutputField, Param } from "@w6w/types";

// ------------------------------------------------------------------ params --

/** `PUT /t/{id}/status.json` — the exact five values the endpoint's enum allows. */
export const topicStatusOptions: Option[] = [
  { value: "closed", label: "Closed", description: "No new replies." },
  { value: "pinned", label: "Pinned", description: "Pinned in its category." },
  { value: "pinned_globally", label: "Pinned globally", description: "Pinned on every list." },
  { value: "archived", label: "Archived", description: "Frozen — no edits or replies." },
  {
    value: "visible",
    label: "Visible",
    description: "Listed. Disabling this unlists the topic.",
  },
];

/** `GET /latest.json` — the `order` enum, verbatim from the endpoint's own description. */
export const topicOrderOptions: Option[] = [
  { value: "default", label: "Default" },
  { value: "created", label: "Created" },
  { value: "activity", label: "Activity" },
  { value: "views", label: "Views" },
  { value: "posts", label: "Posts" },
  { value: "category", label: "Category" },
  { value: "likes", label: "Likes" },
  { value: "op_likes", label: "Likes on the first post" },
  { value: "posters", label: "Posters" },
];

/** `GET /admin/users/list/{flag}.json` — the `flag` path enum. */
export const userFlagOptions: Option[] = [
  { value: "active", label: "Active" },
  { value: "new", label: "New" },
  { value: "staff", label: "Staff" },
  { value: "suspended", label: "Suspended" },
  { value: "blocked", label: "Blocked" },
  { value: "suspect", label: "Suspect" },
];

/** `GET /admin/users/list/{flag}.json` — the `order` query enum. */
export const userOrderOptions: Option[] = [
  { value: "created", label: "Created" },
  { value: "last_emailed", label: "Last emailed" },
  { value: "seen", label: "Last seen" },
  { value: "username", label: "Username" },
  { value: "email", label: "Email" },
  { value: "trust_level", label: "Trust level" },
  { value: "days_visited", label: "Days visited" },
  { value: "posts_read", label: "Posts read" },
  { value: "topics_viewed", label: "Topics viewed" },
  { value: "posts", label: "Posts" },
  { value: "read_time", label: "Read time" },
];

/**
 * The Markdown body of a post. Discourse calls it `raw` on every write endpoint
 * and returns the rendered HTML separately as `cooked`; the two are never
 * interchangeable on input.
 */
export const rawParam: Param = {
  key: "raw",
  label: "Body",
  type: "text",
  required: true,
  config: { multiline: true },
  hint: "Markdown source of the post. Discourse renders it into `cooked` HTML on the way in.",
};

/** 1-based page selector, shared by the endpoints that document one. */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "1-based page number.",
  validation: { integer: true, min: 1 },
};

// ----------------------------------------------------------------- outputs --

/**
 * A Discourse post as returned by the post endpoints.
 *
 * Only the fields that are stable across `POST /posts.json`,
 * `GET /posts/{id}.json` and the `post` envelope of `PUT /posts/{id}.json` are
 * declared. `output` is a display hint for the editor, not a contract the
 * runtime enforces, so listing a field an endpoint sometimes omits would only
 * mislead.
 */
export const postOutput: OutputField[] = [
  { key: "id", type: "number", label: "Post ID" },
  { key: "username", type: "string", label: "Author username" },
  { key: "name", type: "string", label: "Author name" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
  { key: "raw", type: "string", label: "Markdown source" },
  { key: "cooked", type: "string", label: "Rendered HTML" },
  { key: "post_number", type: "number", label: "Post number in topic" },
  { key: "topic_id", type: "number", label: "Topic ID" },
  { key: "topic_slug", type: "string", label: "Topic slug" },
  { key: "reply_count", type: "number", label: "Replies" },
  { key: "reply_to_post_number", type: "number", label: "Reply to post number" },
  { key: "post_type", type: "number", label: "Post type" },
  { key: "score", type: "number", label: "Score" },
];

/** A topic as returned by `GET /t/{id}.json`. */
export const topicOutput: OutputField[] = [
  { key: "id", type: "number", label: "Topic ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "fancy_title", type: "string", label: "Fancy title" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "posts_count", type: "number", label: "Posts" },
  { key: "reply_count", type: "number", label: "Replies" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "last_posted_at", type: "string", label: "Last posted at" },
  { key: "views", type: "number", label: "Views" },
  { key: "like_count", type: "number", label: "Likes" },
  { key: "category_id", type: "number", label: "Category ID" },
  { key: "archetype", type: "string", label: "Archetype" },
  { key: "closed", type: "boolean", label: "Closed" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "pinned", type: "boolean", label: "Pinned" },
  { key: "visible", type: "boolean", label: "Visible" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "post_stream", type: "object", label: "Post stream" },
];

/** The `{ users, topic_list }` envelope every topic-listing endpoint returns. */
export const topicListOutput: OutputField[] = [
  { key: "users", type: "array", label: "Users referenced by the list" },
  { key: "topic_list", type: "object", label: "Topic list" },
  { key: "topic_list.topics", type: "array", label: "Topics" },
  { key: "topic_list.per_page", type: "number", label: "Page size" },
  { key: "topic_list.more_topics_url", type: "string", label: "Next page URL" },
];

/** A category, as it appears inside `category_list.categories`. */
export const categoryOutput: OutputField[] = [
  { key: "id", type: "number", label: "Category ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "color", type: "string", label: "Colour" },
  { key: "text_color", type: "string", label: "Text colour" },
  { key: "description", type: "string", label: "Description" },
  { key: "topic_count", type: "number", label: "Topics" },
  { key: "post_count", type: "number", label: "Posts" },
  { key: "position", type: "number", label: "Position" },
  { key: "parent_category_id", type: "number", label: "Parent category ID" },
  { key: "read_restricted", type: "boolean", label: "Read restricted" },
];

/** A user, as returned by `GET /u/{username}.json` under the `user` key. */
export const userOutput: OutputField[] = [
  { key: "id", type: "number", label: "User ID" },
  { key: "username", type: "string", label: "Username" },
  { key: "name", type: "string", label: "Name" },
  { key: "avatar_template", type: "string", label: "Avatar template" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "last_seen_at", type: "string", label: "Last seen at" },
  { key: "trust_level", type: "number", label: "Trust level" },
  { key: "moderator", type: "boolean", label: "Moderator" },
  { key: "admin", type: "boolean", label: "Admin" },
  { key: "title", type: "string", label: "Title" },
  { key: "badge_count", type: "number", label: "Badges" },
  { key: "groups", type: "array", label: "Groups" },
];

/** A group, as returned under the `group` key of `GET /groups/{name}.json`. */
export const groupOutput: OutputField[] = [
  { key: "id", type: "number", label: "Group ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "full_name", type: "string", label: "Full name" },
  { key: "user_count", type: "number", label: "Members" },
  { key: "automatic", type: "boolean", label: "Automatic" },
  { key: "visibility_level", type: "number", label: "Visibility level" },
  { key: "bio_raw", type: "string", label: "Bio (Markdown)" },
  { key: "bio_cooked", type: "string", label: "Bio (HTML)" },
];

/** The generic `{ success: "OK" }` acknowledgement several write endpoints return. */
export const successOutput: OutputField[] = [
  { key: "success", type: "string", label: "Success" },
];
