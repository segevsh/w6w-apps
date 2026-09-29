import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorClient } from "../lib/client.ts";
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
}

interface Output {
  results: RecordResult[];
  moreRecords?: boolean;
}

/**
 * `DELETE /creator/v2/data/<owner>/<app>/report/<report>` — Delete Records. Needs
 * `ZohoCreator.report.DELETE`. Verified against `delete-records.html`: `criteria`
 * is mandatory (pass `ID!=0` or `ID!=null` to delete every matching record). When
 * over 200 records match, set `processUntilLimit` and loop until `moreRecords`
 * comes back `false` — same pagination contract as Update Records.
 *
 * Marked idempotent: deleting records already gone (a retried call) converges on
 * the same end state — an empty/short `results` array, not a hard error — the same
 * way `zoho-analytics`'s `row-delete` is.
 */
const recordDelete: ActionDefinition<Input, Output> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Records",
  description: "Delete the records in a report matching a criteria.",
  idempotent: true,
  params: [
    accountOwnerName,
    appLinkName,
    reportLinkName,
    criteria,
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
        method: "DELETE",
        body,
        query: { process_until_limit: input.processUntilLimit },
        headers: environmentHeaders(input),
      },
    );
    return { results: out.result ?? [], moreRecords: out.more_records };
  },
};

export default recordDelete;
