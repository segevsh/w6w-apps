import type { ActionDefinition } from "@w6w/types";
import { GladiaClient, toList } from "../lib/client.ts";
import { statusOptions } from "../lib/params.ts";

/**
 * `GET /v2/pre-recorded` — list pre-recorded jobs, newest filters via `offset`/`limit`.
 * The response carries `first`/`current`/`next` URLs (`next` is null on the last page);
 * this action pages with `offset`, so increment it by `limit`.
 *
 * The `custom_metadata` query filter is deliberately not exposed: the OpenAPI document
 * declares it as a bare object with no serialisation style, so its wire form is unverified.
 */
interface Input {
  offset?: number;
  limit?: number;
  status?: string[];
  date?: string;
  afterDate?: string;
  beforeDate?: string;
}

const transcriptionList: ActionDefinition<Input> = {
  key: "transcription-list",
  type: "search",
  resource: "transcription",
  title: "List Transcriptions",
  description: "List pre-recorded jobs, optionally filtered by status and date.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: statusOptions,
    },
    {
      key: "date",
      label: "On date",
      type: "string",
      placeholder: "2026-10-06",
      hint: "A single day, ISO 8601.",
    },
    {
      key: "afterDate",
      label: "Created after",
      type: "string",
      placeholder: "2026-10-06T00:00:00.000Z",
    },
    {
      key: "beforeDate",
      label: "Created before",
      type: "string",
      placeholder: "2026-10-07T00:00:00.000Z",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { min: 1, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { min: 0, integer: true },
      hint: "Skip this many jobs. Page by adding `limit` until `next` is null.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Jobs" },
    { key: "first", type: "string", label: "First page URL" },
    { key: "current", type: "string", label: "Current page URL" },
    { key: "next", type: "string", label: "Next page URL (null on the last page)" },
  ],

  execute(input, ctx) {
    return new GladiaClient(ctx).json("/v2/pre-recorded", {
      query: {
        offset: input.offset,
        limit: input.limit,
        status: toList(input.status),
        date: input.date,
        after_date: input.afterDate,
        before_date: input.beforeDate,
      },
    });
  },
};

export default transcriptionList;
