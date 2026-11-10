import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/request-list.ts";

export default pollFromListAction({
  key: "new-request",
  title: "New Signature Request",
  description: "Polls the existing request-list action ordered by creation time descending.",
  action,
  input: () => ({ rowCount: 100, startIndex: 1, sortColumn: "created_time", sortOrder: "DESC" }),
  items: (result) => (result as { requests?: unknown[] }).requests ?? [],
  idOf: (item) =>
    String(
      (item as { request_id?: unknown; id?: unknown }).request_id ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "request_id", type: "string", label: "Request ID" }],
  sample: { request_id: "request-101" },
});
