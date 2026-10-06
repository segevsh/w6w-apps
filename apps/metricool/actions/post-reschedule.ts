import type { ActionDefinition } from "@w6w/types";
import { callFlag, encodeId } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";

type Input = { blogId: string; id: string; publicationDate: string; timezone?: string };

/** `PATCH /v2/scheduler/posts/{id}?fields=publicationDate` with `{publicationDate}`. */
const postReschedule: ActionDefinition<Input> = {
  key: "post-reschedule",
  type: "perform",
  resource: "post",
  title: "Reschedule Post",
  description: "Change only a scheduled post's publication date. For a thread's parent post the " +
    "whole thread moves.",
  idempotent: true,
  params: [
    blogId,
    str("id", "Post ID", { required: true }),
    str("publicationDate", "New publication date", {
      required: true,
      hint: "Local date-time, e.g. 2026-11-03T10:15:30.",
    }),
    str("timezone", "Timezone", { hint: "IANA timezone of the date, e.g. Europe/Madrid." }),
  ],
  output: [{ key: "success", type: "boolean", label: "The vendor confirmed the change" }],

  execute(input, ctx) {
    return callFlag(ctx, "PATCH", `/v2/scheduler/posts/${encodeId(input.id)}`, {
      blogId: input.blogId,
      query: { fields: "publicationDate" },
      body: {
        publicationDate: {
          dateTime: input.publicationDate,
          ...(input.timezone ? { timezone: input.timezone } : {}),
        },
      },
    });
  },
};

export default postReschedule;
