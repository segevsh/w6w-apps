import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, flag, RingCentralClient } from "../lib/client.ts";
import {
  accountIdParam,
  callDirectionOptions,
  callLogViewOptions,
  callTypeOptions,
  dateRangeParams,
  extensionIdParam,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/call-log` —
 * an extension's call history. Needs `ReadCallLog` (app + user).
 *
 * Two details easy to get wrong:
 *
 *  - `view: "Detailed"` returns one record per call *leg* (each ring,
 *    transfer, hold) rather than one per call, and caps `perPage` at 250
 *    instead of 1000 — this app leaves the vendor's `Simple` default in place
 *    unless the caller asks for `Detailed`.
 *  - The `phoneNumber` filter is documented as e.164 **without** the leading
 *    `+` (`"12053320032"`, not `"+12053320032"`), unlike every phone-number
 *    field this app's SMS/RingOut actions send.
 *  - `withRecording` is deprecated in favor of `recordingType`, which answers
 *    both "has a recording" and "which kind" in one filter — this app only
 *    exposes the current one.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  direction?: string[];
  type?: string[];
  view?: string;
  dateFrom?: string;
  dateTo?: string;
  phoneNumber?: string;
  recordingType?: string;
  showDeleted?: boolean;
  page?: number;
  perPage?: number;
}

const callLogList: ActionDefinition<Input> = {
  key: "call-log-list",
  type: "search",
  resource: "call-log",
  title: "List Call Log Records",
  description: "List an extension's call log, filtered by direction, type and date range.",
  params: [
    accountIdParam,
    extensionIdParam,
    { key: "direction", label: "Direction", type: "multiselect", options: callDirectionOptions },
    { key: "type", label: "Call type", type: "multiselect", options: callTypeOptions },
    {
      key: "view",
      label: "View",
      type: "select",
      options: callLogViewOptions,
      default: "Simple",
      hint: "Detailed returns one record per call leg and caps perPage at 250.",
    },
    ...dateRangeParams("Defaults to dateTo minus 24 hours."),
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      placeholder: "12053320032",
      hint: "Matches either party's number. E.164 WITHOUT the leading + (this endpoint's own " +
        "documented format — unlike the SMS/RingOut actions).",
    },
    {
      key: "recordingType",
      label: "Recording type",
      type: "select",
      options: [
        { value: "Automatic", label: "Automatic recording" },
        { value: "OnDemand", label: "On-demand recording" },
        { value: "All", label: "Any recording" },
      ],
      hint: "Leave empty to return calls with and without recordings.",
    },
    { key: "showDeleted", label: "Include deleted records", type: "boolean" },
    ...paginationParams(100, "RingCentral's own default; max 1000 (Simple) / 250 (Detailed)."),
  ],
  output: [
    { key: "records", type: "array", label: "Call log records" },
    { key: "paging", type: "object", label: "page / perPage / totalPages / totalElements" },
    { key: "navigation", type: "object", label: "First/next/previous/last page links" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/call-log`,
      {
        query: {
          direction: input.direction,
          type: input.type,
          view: input.view,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          phoneNumber: input.phoneNumber,
          recordingType: input.recordingType,
          showDeleted: flag(input.showDeleted),
          page: input.page,
          perPage: input.perPage,
        },
      },
    );
  },
};

export default callLogList;
