import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";

/**
 * `PUT /t/-/{id}.json` — and that `-` is literal.
 *
 * Discourse's topic routes are normally `/t/{slug}/{id}`, and the update route
 * keeps the shape while accepting `-` as a stand-in for "I don't know the
 * slug". The endpoint is published in the API reference at exactly that path,
 * so the dash is hard-coded here rather than exposed as a parameter: there is
 * no case where a caller wants a different value in that slot, and offering one
 * would just invite a 404.
 *
 * The body is nested — `{ "topic": { … } }`, not the flat form the create
 * endpoint takes. The reference declares only `title` and `category_id` inside
 * it, so only those two are offered.
 */
interface Input {
  topicId: number | string;
  title?: string;
  categoryId?: number;
}

const topicUpdate: ActionDefinition<Input> = {
  key: "topic-update",
  type: "perform",
  resource: "topic",
  title: "Update Topic",
  description: "Retitle a topic or move it to another category.",
  // Same body twice leaves the topic in the same state.
  idempotent: true,
  params: [
    {
      key: "topicId",
      label: "Topic ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "title", label: "Title", type: "string" },
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      hint: "Moves the topic. Numeric id, from `category-list`.",
      validation: { integer: true },
    },
  ],
  output: [
    { key: "basic_topic", type: "object", label: "Updated topic" },
    { key: "basic_topic.id", type: "number", label: "Topic ID" },
    { key: "basic_topic.title", type: "string", label: "Title" },
    { key: "basic_topic.slug", type: "string", label: "Slug" },
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(
      `/t/-/${encodeURIComponent(String(input.topicId))}.json`,
      {
        method: "PUT",
        body: {
          topic: compact({
            title: unset(input.title),
            category_id: input.categoryId,
          }),
        },
      },
    );
  },
};

export default topicUpdate;
