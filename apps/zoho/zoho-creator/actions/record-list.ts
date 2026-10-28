import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorApiError, ZohoCreatorClient } from "../lib/client.ts";
import {
  accountOwnerName,
  appLinkName,
  criteria,
  demoUserName,
  environmentParam,
  reportLinkName,
} from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  reportLinkName: string;
  from?: number;
  limit?: number;
  criteria?: string;
  environment?: string;
  demoUserName?: string;
}

interface Output {
  records: Array<Record<string, unknown>>;
}

/** No records matched — `status-codes.html`'s documented `404 / 3100`, not a real failure. */
const NO_RECORDS_CODE = 3100;

/**
 * `GET /creator/v2/data/<owner>/<app>/report/<report>` — Get Records (Quick View).
 * Needs `ZohoCreator.report.READ`. Returns only the fields shown in the report's
 * quick view, up to 200 records per call (`from`/`limit` page through more).
 * Verified against `get-records.html`.
 *
 * A criteria matching nothing answers `404 {"code":3100,"description":"No records
 * found for the given criteria."}` — a real, documented, non-error outcome (see
 * `lib/client.ts`'s module doc) — so that specific case is folded into an empty
 * `records` array instead of surfacing an error to the workflow.
 */
const recordList: ActionDefinition<Input, Output> = {
  key: "record-list",
  type: "read",
  resource: "record",
  title: "List Records",
  description: "List the records shown in a report's quick view, optionally filtered by " +
    "criteria. Fetches at most 200 records per call — page with From/Limit for more.",
  params: [
    accountOwnerName,
    appLinkName,
    reportLinkName,
    {
      key: "from",
      label: "From",
      type: "number",
      advanced: true,
      hint: "The starting index to fetch records from.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      advanced: true,
      hint: "Max records to fetch — up to 200.",
    },
    criteria,
    environmentParam,
    demoUserName,
  ],
  output: [{ key: "records", type: "array", label: "Records" }],

  async execute(input, ctx) {
    try {
      const data = await new ZohoCreatorClient(ctx).request<
        { data?: Array<Record<string, unknown>> }
      >(
        `/data/${encodeURIComponent(input.accountOwnerName)}/${
          encodeURIComponent(input.appLinkName)
        }/report/${encodeURIComponent(input.reportLinkName)}`,
        {
          query: { from: input.from, limit: input.limit, criteria: input.criteria },
          headers: environmentHeaders(input),
        },
      );
      return { records: data.data ?? [] };
    } catch (err) {
      if (err instanceof ZohoCreatorApiError && err.code === NO_RECORDS_CODE) {
        return { records: [] };
      }
      throw err;
    }
  },
};

export default recordList;
