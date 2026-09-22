import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, SIMPLE } from "../lib/client.ts";
import { commentOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
  activityId: string;
  userId: string;
  content?: string;
}

/**
 * `GET /api/simple/leads/{lead_id}/add_activity?activity_id=…&user_id=…&content=…`
 * — log an activity on a lead.
 *
 * Another Simplified API GET-that-mutates (see `lead-add-tag` for why that verb
 * is the vendor's own design and why this app names the action after its
 * effect). The example request is
 * `curl -H "X-API-KEY: …" "https://…/api/simple/leads/145676/add_activity?activity_id=45&user_id=35&content=Demo"`.
 *
 * The parameter table marks `activity_id` and `user_id` **required** and
 * `content` optional. `user_id` is "the identifier of the user who posts the
 * activity" — it is part of the activity's identity, not an assignee, which is
 * why it is required even though the request is signed with an account-level
 * key.
 *
 * The response is the created comment/activity object — the document's example
 * carries `content`, `commented_item`, `activity_id`, `raw_content` and the
 * `user` who posted it, i.e. the same shape the `/v2` comment endpoints return.
 *
 * Not idempotent: each call posts a new activity.
 */
const leadLogActivity: ActionDefinition<Input> = {
  key: "lead-log-activity",
  type: "perform",
  resource: "lead",
  title: "Log Activity on Lead",
  description:
    "Post an activity (a logged call, meeting or note) on a lead, attributed to a user. " +
    "Simplified API, so it needs an API-key connection (GET /api/simple/leads/{id}/add_activity).",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
    {
      key: "activityId",
      label: "Activity ID",
      type: "string",
      required: true,
      hint: "The identifier of the activity to log, as configured in the account.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The identifier of the user who posts the activity.",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      config: { multiline: true },
      hint: "The content of the activity to log. Optional per the document.",
    },
  ],
  output: commentOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(
      `${SIMPLE}/leads/${encodeURIComponent(input.leadId)}/add_activity`,
      {
        query: {
          activity_id: input.activityId,
          user_id: input.userId,
          content: input.content,
        },
      },
    );
  },
};

export default leadLogActivity;
