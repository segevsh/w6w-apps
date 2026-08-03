import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";
import { postOutput, rawParam } from "../lib/params.ts";

/**
 * Creating a topic is `POST /posts.json` — the same endpoint that creates a
 * reply and a private message. Discourse's own summary for it is "Creates a new
 * topic, a new post, or a private message", and which of the three you get is
 * decided by the body:
 *
 *   - `title` present, no `topic_id`  → a new topic       (this action)
 *   - `topic_id` present             → a reply            (`post-create`)
 *   - `archetype: private_message`   → a PM               (`message-create`)
 *
 * They are three actions rather than one endpoint with a mode switch because
 * the required fields differ, and a single form whose requirements change under
 * you is the classic way to ship a 422.
 *
 * `category` really is singular and an integer id, not `category_id` and not a
 * slug. The endpoint's parameter table names it `category` and types it
 * `integer`; `category-list` is how you find the number.
 */
interface Input {
  title: string;
  raw: string;
  category?: number;
  createdAt?: string;
  embedUrl?: string;
  externalId?: string;
  autoTrack?: boolean;
}

const topicCreate: ActionDefinition<Input> = {
  key: "topic-create",
  type: "perform",
  resource: "topic",
  title: "Create Topic",
  description: "Start a new topic in a category.",
  // Discourse mints a new topic per call and has no create-or-update form to
  // converge a retry on. Repeating the call yields a second topic, which the
  // forum's own duplicate-content guard may or may not reject.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    rawParam,
    {
      key: "category",
      label: "Category ID",
      type: "number",
      hint: "Numeric id, not a slug. `category-list` returns them.",
      validation: { integer: true },
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "Backdate the topic. Requires a staff key.",
    },
    {
      key: "embedUrl",
      label: "Embed URL",
      type: "string",
      advanced: true,
      hint:
        "Associates the topic with a page on another site — how Discourse is used as a comment " +
        "system for an external blog.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "Your own id for this topic. `topic-get` can look a topic up by it.",
    },
    {
      key: "autoTrack",
      label: "Track topic",
      type: "boolean",
      advanced: true,
      hint: "Defaults to true on Discourse's side — set false to not track the new topic.",
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/posts.json", {
      method: "POST",
      body: compact({
        title: input.title,
        raw: input.raw,
        category: input.category,
        created_at: unset(input.createdAt),
        embed_url: unset(input.embedUrl),
        external_id: unset(input.externalId),
        // A real JSON boolean: `auto_track` is typed `boolean` on this endpoint,
        // unlike `enabled` on `topic-set-status`. `compact` drops `undefined`
        // but keeps `false`, which is the meaningful value here.
        auto_track: input.autoTrack,
      }),
    });
  },
};

export default topicCreate;
