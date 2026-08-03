import type { ActionDefinition } from "@w6w/types";
import { LemlistClient, PAGE_PARAMS, type PageInput, pageQuery } from "../lib/client.ts";

interface Input extends PageInput {
  type?: string;
  campaignId?: string;
  leadId?: string;
  isFirst?: boolean;
  minDate?: string;
  maxDate?: string;
  version?: "v2";
}

/**
 * `GET /activities?version=v2` — the history of every campaign step performed.
 *
 * ## `version=v2` is REQUIRED
 *
 * lemlist's OpenAPI marks the parameter `required: true` with the description
 * "API version. v2 is mandatory". It is sent unconditionally.
 *
 * ## Date filtering: `minDate`/`maxDate`, not `startDate`/`endDate`
 *
 * lemlist accepts two naming conventions and documents the precedence: "`minDate`
 * / `maxDate` (primary)" and "`startDate` / `endDate` (aliases, kept consistent
 * with sibling endpoints such as `/campaigns/{campaignId}/stats`)", where "the
 * primary one wins: `minDate` takes precedence over `startDate`". Exposing both
 * pairs would only let a caller build a request where half their input is
 * silently ignored, so this action exposes the primary pair alone. Both accept a
 * Unix timestamp in seconds or an ISO 8601 datetime, and `maxDate` must be
 * strictly greater than `minDate`.
 *
 * ## `type` is an open string
 *
 * lemlist's schema for the filter is a bare `type: string` with `paused` as the
 * example, and the Activity object's own type vocabulary is long and still
 * growing (`manualDone`, `emailsOpened`, `emailsReplied`, …). Publishing a
 * `select` here would freeze a list lemlist has not frozen, so it stays a
 * string.
 */
const listActivities: ActionDefinition<Input> = {
  key: "list-activities",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description:
    "List campaign activity history — opens, replies, step completions — filtered by type, campaign, lead or date range.",
  params: [
    {
      key: "type",
      label: "Activity type",
      type: "string",
      placeholder: "emailsReplied",
      hint: "Filter to one activity type, e.g. `emailsOpened`, `emailsReplied`, `paused`, " +
        "`manualDone`. lemlist publishes no closed enum for this filter.",
    },
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
    },
    { key: "leadId", label: "Lead id", type: "string", placeholder: "lea_8xJSc7sV7ggpiVnXe" },
    {
      key: "isFirst",
      label: "First activity only",
      type: "boolean",
      hint: "Restrict to the first activity of its kind.",
    },
    {
      key: "minDate",
      label: "From",
      type: "string",
      placeholder: "2026-05-01T00:00:00Z",
      hint: "Filters `createdAt >= minDate`. ISO 8601 datetime or a Unix timestamp in seconds. " +
        "lemlist also accepts `startDate` as an alias, but `minDate` wins — so only this one " +
        "is exposed.",
    },
    {
      key: "maxDate",
      label: "To",
      type: "string",
      placeholder: "2026-05-31T23:59:59Z",
      hint:
        "Filters `createdAt <= maxDate`, and must be strictly greater than From when both are " +
        "set. ISO 8601 datetime or a Unix timestamp in seconds.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Activities per page. lemlist defaults to 100; maximum 100.",
    },
    ...PAGE_PARAMS.filter((p) => p.key !== "limit"),
    {
      key: "version",
      label: "API version",
      type: "select",
      options: [{ value: "v2", label: "v2" }],
      default: "v2",
      hint: "lemlist marks `version=v2` MANDATORY on this route. Leave it alone.",
    },
  ],
  output: [{ key: "activities", type: "array", label: "Activities" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>("/activities", {
      query: {
        ...pageQuery(input),
        type: input.type,
        campaignId: input.campaignId,
        leadId: input.leadId,
        isFirst: input.isFirst,
        minDate: input.minDate,
        maxDate: input.maxDate,
        version: input.version ?? "v2",
      },
    });
  },
};

export default listActivities;
