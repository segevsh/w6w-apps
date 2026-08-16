import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, QANDA_URL } from "../lib/client.ts";

interface Input {
  locationId: string;
  answersPerQuestion?: number;
  ignoreAnswered?: boolean;
  orderBy?: "update_time desc" | "upvote_count desc";
  pageSize?: number;
  pageToken?: string;
}

/**
 * `locations.questions.list` — https://developers.google.com/my-business/reference/qanda/rest/v1/locations.questions/list
 */
const listQuestions: ActionDefinition<Input> = {
  key: "list-questions",
  type: "read",
  resource: "question",
  title: "List Questions",
  description: "List the questions asked on a location's Business Profile.",
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "answersPerQuestion",
      label: "Answers per question",
      type: "number",
      default: 10,
      hint: "Default and maximum is 10.",
    },
    {
      key: "ignoreAnswered",
      label: "Only unanswered questions",
      type: "boolean",
      default: false,
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "update_time desc", label: "Most recently updated" },
        { value: "upvote_count desc", label: "Most upvoted" },
      ],
    },
    { key: "pageSize", label: "Page size", type: "number", default: 10 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "questions", type: "array", label: "Questions" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "totalSize", type: "number", label: "Total size" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(QANDA_URL, `/locations/${input.locationId}/questions`, {
      query: {
        answersPerQuestion: input.answersPerQuestion ?? 10,
        filter: input.ignoreAnswered ? "ignore_answered=true" : undefined,
        orderBy: input.orderBy,
        pageSize: input.pageSize ?? 10,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listQuestions;
