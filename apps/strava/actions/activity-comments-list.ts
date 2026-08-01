import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { activityId, pagination } from "../lib/params.ts";

interface Input {
  activityId: string;
  page?: number;
  perPage?: number;
}

/** `GET /activities/{id}/comments` — comments on an activity. */
const activityCommentsList: ActionDefinition<Input> = {
  key: "activity-comments-list",
  type: "read",
  resource: "activity",
  title: "List Activity Comments",
  description: "List the comments on an activity.",
  params: [activityId, ...pagination],
  output: [{ key: "comments", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/activities/${input.activityId}/comments`, {
      query: { page: input.page, per_page: input.perPage },
    });
  },
};

export default activityCommentsList;
