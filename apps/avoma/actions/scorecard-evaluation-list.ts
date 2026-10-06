import type { ActionDefinition } from "@w6w/types";
import { AvomaClient, toList } from "../lib/client.ts";
import { nextParam, pageOutput, pageSizeParam } from "../lib/params.ts";

/**
 * `GET /v1/scorecard_evaluations/` — completed scorecards on meetings. Unlike the other list
 * endpoints, the date range is OPTIONAL here. `scorecard_uuids` and `user_emails` are
 * documented as arrays, so they go out as repeated keys (`user_emails=a&user_emails=b`),
 * not comma-joined.
 */
interface Input {
  fromDate?: string;
  toDate?: string;
  meetingUuid?: string;
  scorecardUuids?: string[] | string;
  userEmails?: string[] | string;
  pageSize?: number;
  next?: string;
}

const scorecardEvaluationList: ActionDefinition<Input> = {
  key: "scorecard-evaluation-list",
  type: "search",
  resource: "scorecard",
  title: "List Scorecard Evaluations",
  description: "List scorecard evaluations (scores, answers and justifications) for meetings, " +
    "filtered by date, meeting, template or the person scored.",
  params: [
    { key: "fromDate", label: "From date", type: "datetime", hint: "Optional. UTC." },
    { key: "toDate", label: "To date", type: "datetime", hint: "Optional. UTC." },
    { key: "meetingUuid", label: "Meeting UUID", type: "string" },
    {
      key: "scorecardUuids",
      label: "Scorecard UUIDs",
      type: "string",
      hint: "Comma-separated scorecard template UUIDs.",
    },
    {
      key: "userEmails",
      label: "Scored-for user emails",
      type: "string",
      hint: "Comma-separated emails of the users the evaluation is for.",
    },
    pageSizeParam(),
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new AvomaClient(ctx).list("/v1/scorecard_evaluations/", {
      from_date: input.fromDate,
      to_date: input.toDate,
      meeting_uuid: input.meetingUuid,
      scorecard_uuids: toList(input.scorecardUuids),
      user_emails: toList(input.userEmails),
      page_size: input.pageSize,
    }, input.next);
  },
};

export default scorecardEvaluationList;
