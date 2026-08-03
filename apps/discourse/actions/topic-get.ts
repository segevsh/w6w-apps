import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { topicOutput } from "../lib/params.ts";

/**
 * `GET /t/{id}.json` returns the topic together with its `post_stream` — the
 * first page of posts inline, plus `post_stream.stream`, the full ordered list
 * of post ids in the topic. That is the shape Discourse's own web client
 * consumes, and it is why there is no separate "get the first post" action:
 * `post_stream.posts[0]` is already here.
 */
interface Input {
  topicId: number | string;
}

const topicGet: ActionDefinition<Input> = {
  key: "topic-get",
  type: "read",
  resource: "topic",
  title: "Get Topic",
  description: "Fetch one topic with the first page of its posts.",
  params: [
    {
      key: "topicId",
      label: "Topic ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: topicOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(`/t/${encodeURIComponent(String(input.topicId))}.json`);
  },
};

export default topicGet;
