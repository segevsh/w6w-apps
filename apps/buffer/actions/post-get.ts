import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";
import { POST_FIELDS, postOutput } from "../lib/params.ts";

/**
 * `query post(input: PostInput!)` — one post by id, optionally with its
 * performance metrics.
 *
 * ## Metrics are opt-in, and there are two reasons
 *
 * `Post.metrics` is Buffer's normalised, cross-network performance data —
 * reactions, comments, impressions and so on, each a `{ type, name,
 * description, value, unit }` row. Buffer says two things about it that a
 * workflow needs to know before switching it on:
 *
 *  1. **It may not be readable at all on this Connection.** *"Reading metrics
 *     is available for personal workflows and automations only, using a
 *     personal API key."* An OAuth-backed Connection is therefore the wrong
 *     credential for it, and pulling the field unconditionally would make every
 *     `post-get` on an OAuth Connection a coin flip.
 *  2. **It is up to a day stale.** `metricsUpdatedAt` is *"Null until the daily
 *     ingestion job has processed the post. Buffer pulls fresh metrics once per
 *     day, so this can lag the network value by ~24h."* Anything reading a
 *     number here should read the timestamp beside it.
 *
 * `metrics` is also null outright until a post is sent — *"If post is not yet
 * sent, this field will be null"* — so on a queued post the field costs
 * complexity to return nothing.
 *
 * Hence a boolean, off by default, with the caveats on it.
 *
 * ## `metadata` is not selected, at any setting
 *
 * `Post.metadata` is a union across twelve networks whose expansion runs to
 * hundreds of fields. Selecting it on a single post is affordable in principle,
 * but every consumer of it wants one network's arm, and there is no way to ask
 * for that generically without embedding all twelve. It is listed under
 * "deliberately not built" in the README rather than half-done here.
 */
const POST_QUERY = `query W6wPost($input: PostInput!) {
  post(input: $input) {
${POST_FIELDS}
  }
}`;

const POST_QUERY_WITH_METRICS = `query W6wPostWithMetrics($input: PostInput!) {
  post(input: $input) {
${POST_FIELDS}
    metricsUpdatedAt
    metrics { type name description value unit }
  }
}`;

interface Input {
  postId: string;
  includeMetrics?: boolean;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "One post by id, with its status, scheduled time and any publishing error.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "includeMetrics",
      label: "Include metrics",
      type: "boolean",
      hint: "Adds Buffer's normalised performance metrics. Null until the post is sent, up to " +
        "~24h stale, and Buffer documents metrics as readable **with a personal API key " +
        "only** — expect nothing useful on an OAuth Connection.",
    },
  ],
  output: [
    ...postOutput.map((f) => ({ ...f, key: `post.${f.key}` })),
    { key: "post.metrics", type: "array", label: "Metrics (opt-in)" },
    { key: "post.metricsUpdatedAt", type: "string", label: "Metrics refreshed at" },
  ],

  execute(input, ctx) {
    const query = input.includeMetrics ? POST_QUERY_WITH_METRICS : POST_QUERY;
    return new BufferClient(ctx).request(query, { input: { id: input.postId } });
  },
};

export default postGet;
