import type { ActionDefinition } from "@w6w/types";
import { camelKeys, qs, ses } from "../lib/api.ts";

/**
 * ListSuppressedDestinations — `GET /v2/email/suppression/addresses`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListSuppressedDestinations.html
 */
interface Input {
  reason?: string;
  startDate?: string;
  endDate?: string;
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "suppression-list",
  type: "search",
  resource: "suppression",
  title: "List Suppressed Destinations",
  description:
    "List addresses on the account suppression list (bounces and complaints SES will no longer send to).",
  params: [
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: [{ value: "BOUNCE", label: "Bounce" }, { value: "COMPLAINT", label: "Complaint" }],
    },
    { key: "startDate", label: "Updated after", type: "datetime" },
    { key: "endDate", label: "Updated before", type: "datetime" },
    { key: "pageSize", label: "Page size", type: "number", hint: "Max items per page (1-1000)." },
    {
      key: "nextToken",
      label: "Next token",
      type: "string",
      hint: "Token from a previous call to fetch the next page.",
    },
  ],
  output: [
    { key: "destinations", type: "array", label: "emailAddress, reason, lastUpdateTime" },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    const res = await ses<{ SuppressedDestinationSummaries?: unknown[]; NextToken?: string }>(ctx, {
      op: "ListSuppressedDestinations",
      path: "/v2/email/suppression/addresses",
      query: qs({
        Reason: input.reason,
        StartDate: input.startDate,
        EndDate: input.endDate,
        PageSize: input.pageSize,
        NextToken: input.nextToken,
      }),
    });
    return {
      destinations: camelKeys(res.SuppressedDestinationSummaries ?? []),
      nextToken: res.NextToken,
    };
  },
};

export default action;
