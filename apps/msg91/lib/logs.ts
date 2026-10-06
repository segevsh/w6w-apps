import type { ActionDefinition } from "@w6w/types";
import { call, pick, requireStr } from "./client.ts";
import { int, str } from "./params.ts";

type Input = Record<string, unknown>;

/**
 * The four MSG91 report-log endpoints share one shape: `startDate`/`endDate` (a 3-day window,
 * start within the last 3 days), optional `requestId`, `fields` and `limit`; the response is
 * `{data: [...], metadata: {total, paginationToken, ...}}`.
 */
export function logsAction(o: {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
  fieldsHint: string;
}): ActionDefinition<Input> {
  return {
    key: o.key,
    type: "read",
    resource: o.resource,
    title: o.title,
    description: o.description,
    params: [
      str("startDate", "Start date", {
        required: true,
        hint: "YYYY-MM-DD, within the last 3 days.",
      }),
      str("endDate", "End date", {
        required: true,
        hint: "YYYY-MM-DD, at most 3 days after the start.",
      }),
      str("requestId", "Request ID", { hint: "Only the log rows for one submission." }),
      str("fields", "Fields", { hint: o.fieldsHint }),
      int("limit", "Limit", { hint: "MSG91 returns 1000 rows by default." }),
    ],
    output: [
      { key: "data", type: "array", label: "Log rows" },
      { key: "total", type: "number", label: "Rows matched" },
      { key: "metadata", type: "object", label: "MSG91 report metadata" },
    ],

    async execute(input, ctx) {
      const res = await call(ctx, "GET", o.path, {
        query: {
          startDate: requireStr("startDate", input.startDate),
          endDate: requireStr("endDate", input.endDate),
          ...pick(input, ["requestId", "fields", "limit"]),
        },
      });
      const metadata = (res.metadata ?? {}) as Record<string, unknown>;
      const data = Array.isArray(res.data) ? res.data : [];
      return {
        data,
        total: typeof metadata.total === "number" ? metadata.total : data.length,
        metadata,
      };
    },
  };
}
