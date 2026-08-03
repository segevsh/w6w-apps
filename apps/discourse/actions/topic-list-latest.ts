import type { ActionDefinition } from "@w6w/types";
import { boolString, DiscourseClient, unset } from "../lib/client.ts";
import { topicListOutput, topicOrderOptions } from "../lib/params.ts";

/**
 * `GET /latest.json` — the forum's front page as JSON.
 *
 * Two details from the endpoint's own parameter table, both easy to get wrong:
 *
 *   - **`ascending` is a string, not a boolean.** Discourse types it `string`
 *     and describes it as "Defaults to `desc`, add `ascending=true` to sort
 *     asc". It is sent as the literal token, per the API's stated boolean
 *     convention.
 *   - **`per_page` is capped at 100** ("Maximum number of topics returned,
 *     between 1-100"). The cap is declared on the param so the editor rejects
 *     201 rather than the server doing it.
 *
 * Paging past the first page is done by following `topic_list.more_topics_url`
 * from the response, which is why no `page` param is offered here: the
 * reference documents none for this endpoint, and inventing one would be
 * guessing.
 */
interface Input {
  order?: string;
  ascending?: boolean;
  perPage?: number;
}

const topicListLatest: ActionDefinition<Input> = {
  key: "topic-list-latest",
  type: "search",
  resource: "topic",
  title: "List Latest Topics",
  description: "The forum's latest topics, in the order the front page uses.",
  params: [
    {
      key: "order",
      label: "Order by",
      type: "select",
      options: topicOrderOptions,
      hint: "Discourse's own ordering vocabulary for topic lists.",
    },
    {
      key: "ascending",
      label: "Ascending",
      type: "boolean",
      hint: "Defaults to descending.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "1-100.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: topicListOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/latest.json", {
      query: {
        order: unset(input.order),
        // Documented as a string enum, so it is sent as one.
        ascending: input.ascending === undefined ? undefined : boolString(input.ascending),
        per_page: input.perPage,
      },
    });
  },
};

export default topicListLatest;
