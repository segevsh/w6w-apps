import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { topicListOutput } from "../lib/params.ts";

/**
 * `GET /c/{slug}/{id}.json` — the topics in one category.
 *
 * Both path segments are required by the endpoint, and that is the thing to
 * know about it: Discourse's category routes carry the slug **and** the id, and
 * the reference declares both as required path parameters. The id is what
 * actually selects the category; the slug is there so the URL is legible and
 * matches the forum's own permalinks.
 *
 * Unlike `/t/-/{id}.json`, this route is not documented as accepting `-` in the
 * slug slot, so the slug is asked for rather than substituted. `category-list`
 * returns both halves for every category.
 */
interface Input {
  slug: string;
  categoryId: number | string;
}

const categoryTopicList: ActionDefinition<Input> = {
  key: "category-topic-list",
  type: "search",
  resource: "category",
  title: "List Category Topics",
  description: "Topics inside one category.",
  params: [
    {
      key: "slug",
      label: "Category slug",
      type: "string",
      required: true,
      row: "category",
      hint: "From `category-list` — Discourse's category URLs carry the slug and the id.",
    },
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      required: true,
      row: "category",
      validation: { integer: true },
    },
  ],
  output: topicListOutput,

  execute(input, ctx) {
    const slug = encodeURIComponent(input.slug);
    const id = encodeURIComponent(String(input.categoryId));
    return new DiscourseClient(ctx).request(`/c/${slug}/${id}.json`);
  },
};

export default categoryTopicList;
