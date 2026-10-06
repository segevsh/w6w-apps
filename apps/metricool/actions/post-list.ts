import type { ActionDefinition } from "@w6w/types";
import { callList } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";

type Input = { blogId: string; start: string; end: string; timezone?: string };

/** `GET /v2/scheduler/posts` — scheduled posts between two dates. */
const postList: ActionDefinition<Input> = {
  key: "post-list",
  type: "read",
  resource: "post",
  title: "List Scheduled Posts",
  description: "List a brand's scheduled posts between two dates.",
  params: [
    blogId,
    str("start", "Start", { required: true, hint: "Local date-time, e.g. 2026-11-01T00:00:00." }),
    str("end", "End", { required: true, hint: "Local date-time, e.g. 2026-11-30T23:59:59." }),
    str("timezone", "Timezone", { hint: "IANA timezone for the range, e.g. Europe/Madrid." }),
  ],
  output: [
    { key: "items", type: "array", label: "Scheduled posts" },
    { key: "count", type: "number", label: "Number of posts" },
  ],

  execute(input, ctx) {
    return callList(ctx, "/v2/scheduler/posts", {
      blogId: input.blogId,
      query: { start: input.start, end: input.end, timezone: input.timezone },
    });
  },
};

export default postList;
