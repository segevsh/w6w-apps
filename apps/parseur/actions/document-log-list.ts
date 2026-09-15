import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient, type ParseurListPage } from "../lib/client.ts";
import { documentIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /document/{id}/log_set` — the processing log entries for one document.
 *
 * Each entry's `status` is one of `LogStatusEnum` (`SUCCESS`, `ERROR`,
 * `INFO`, `WARNING`) and `source` is one of `LogSourceEnum` (`DOCUMENT`,
 * `OCRDOC`, `WEBHOOK`) — this is the endpoint to read when a document ends up
 * `PARSEDKO` or `EXPORTKO` and the reason isn't obvious from the document
 * record alone.
 */
interface Input {
  documentId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
}

const documentLogList: ActionDefinition<Input> = {
  key: "document-log-list",
  type: "search",
  resource: "document",
  title: "List Document Logs",
  description: "List the processing log entries for one document.",
  params: [documentIdParam, ...paginationParams()],
  output: [
    { key: "count", type: "number", label: "Log entries on this page" },
    { key: "current", type: "number", label: "Current page" },
    { key: "total", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Log entries" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request<ParseurListPage<unknown>>(
      `/document/${encodeId(input.documentId)}/log_set`,
      { query: paginationQuery(input) },
    );
  },
};

export default documentLogList;
