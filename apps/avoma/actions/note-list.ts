import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import {
  fromDateParam,
  nextParam,
  pageOutput,
  pageSizeParam,
  requireRange,
  toDateParam,
} from "../lib/params.ts";

/**
 * `GET /v1/notes/` — AI-generated notes.
 *
 * The prose says `meeting` but the parameter table names it `meeting_uuid`; the table is
 * followed. `data` is a JSON object for `json` output and a string for `html` / `markdown`.
 * A 204 means no notes matched and carries a `detail`; it is returned as an empty page.
 */
interface Input {
  fromDate?: string;
  toDate?: string;
  meetingUuid?: string;
  customCategory?: string;
  outputFormat?: string;
  order?: string;
  pageSize?: number;
  next?: string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List Notes",
  description: "List AI-generated meeting notes in a date window, optionally for one meeting " +
    "or one smart category, as JSON, HTML or Markdown.",
  params: [
    fromDateParam(true, "Notes for meetings"),
    toDateParam(true, "Notes for meetings"),
    { key: "meetingUuid", label: "Meeting UUID", type: "string" },
    {
      key: "customCategory",
      label: "Smart category UUID",
      type: "string",
      hint: "Only notes for this smart (custom) category.",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: [
        { value: "json", label: "JSON" },
        { value: "html", label: "HTML" },
        { value: "markdown", label: "Markdown" },
      ],
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "-start_at", label: "Newest meeting first" },
        { value: "start_at", label: "Oldest meeting first" },
        { value: "-modified", label: "Recently modified first" },
        { value: "modified", label: "Least recently modified first" },
      ],
    },
    pageSizeParam(),
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    requireRange(input);
    return new AvomaClient(ctx).list("/v1/notes/", {
      from_date: input.fromDate,
      to_date: input.toDate,
      meeting_uuid: input.meetingUuid,
      custom_category: input.customCategory,
      output_format: input.outputFormat,
      o: input.order,
      page_size: input.pageSize,
    }, input.next);
  },
};

export default noteList;
