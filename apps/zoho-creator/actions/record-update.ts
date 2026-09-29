import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, parseJsonObject, ZohoCreatorClient } from "../lib/client.ts";
import {
  accountOwnerName,
  appLinkName,
  criteria,
  demoUserName,
  environmentParam,
  messageParam,
  processUntilLimit,
  reportLinkName,
  tasksParam,
} from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  reportLinkName: string;
  criteria: string;
  data: unknown;
  processUntilLimit?: boolean;
  message?: boolean;
  tasks?: boolean;
  environment?: string;
  demoUserName?: string;
}

interface RecordResult {
  code: number;
  data?: Record<string, unknown>;
  message?: string;
  error?: string[];
  tasks?: Record<string, unknown>;
}

interface Output {
  results: RecordResult[];
  moreRecords?: boolean;
}

/**
 * `PATCH /creator/v2/data/<owner>/<app>/report/<report>` — Update Records. Needs
 * `ZohoCreator.report.UPDATE`. Verified against `update-records.html`: `criteria`
 * is mandatory (pass `ID!=0` or `ID!=null` to update every matching record — this
 * is Zoho's own guard against accidentally updating everything). When over 200
 * records match, the request fails unless `processUntilLimit` is set, which then
 * updates the first 200 and returns `moreRecords: true` — loop this action until it
 * comes back `false`.
 *
 * Marked idempotent: re-sending the same criteria+data converges on the same end
 * state, the same way `zohobooks`'s `contact-update`/`zoho-analytics`'s
 * `row-update` are.
 */
const recordUpdate: ActionDefinition<Input, Output> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Records",
  description: "Update the records in a report matching a criteria. `data` is field link " +
    'name -> new value, e.g. { "Status": "Closed" }.',
  idempotent: true,
  params: [
    accountOwnerName,
    appLinkName,
    reportLinkName,
    criteria,
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: 'JSON object of field link name -> new value, e.g. { "Status": "Closed" }.',
    },
    processUntilLimit,
    messageParam,
    tasksParam,
    environmentParam,
    demoUserName,
  ],
  output: [
    { key: "results", type: "array", label: "Per-record results" },
    { key: "moreRecords", type: "boolean", label: "More matching records remain" },
  ],

  async execute(input, ctx) {
    const body = {
      criteria: input.criteria,
      data: parseJsonObject(input.data, "data"),
      result: {
        message: input.message ?? false,
        tasks: input.tasks ?? false,
      },
    };
    const out = await new ZohoCreatorClient(ctx).request<
      { result: RecordResult[]; more_records?: boolean }
    >(
      `/data/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/report/${encodeURIComponent(input.reportLinkName)}`,
      {
        method: "PATCH",
        body,
        query: { process_until_limit: input.processUntilLimit },
        headers: environmentHeaders(input),
      },
    );
    return { results: out.result ?? [], moreRecords: out.more_records };
  },
};

export default recordUpdate;
