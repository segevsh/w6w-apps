import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/request-list.ts";

/** Wraps `request-list` sorted `REQUESTED_AT` descending (the `RequestsSortInput` key the action offers). */
export default pollFromListAction({
  key: "new-request",
  title: "New Request",
  description:
    "The run gets each newly submitted client request, polled from the existing `request-list` action sorted by `REQUESTED_AT` descending.",
  action,
  input: () => ({ sortKey: "REQUESTED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { requests?: { nodes?: unknown[] } }).requests?.nodes ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Request ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "requestStatus", type: "string", label: "Status" },
    { key: "client", type: "object", label: "Client (id, name)" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1JlcXVlc3QvMQ==",
    title: "Fence repair",
    requestStatus: "new",
    client: { id: "Z2lkOi8vSm9iYmVyL0NsaWVudC8x", name: "Helen Myer" },
    createdAt: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
