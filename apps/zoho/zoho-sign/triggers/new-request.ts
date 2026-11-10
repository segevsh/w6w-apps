import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/request-list.ts";

export default pollFromListAction({
  key: "new-request",
  title: "New Signature Request",
  description: "The run gets each newly created signature request (document), newest first.",
  action,
  input: () => ({ rowCount: 100, startIndex: 1, sortColumn: "created_time", sortOrder: "DESC" }),
  items: (result) => (result as { requests?: unknown[] }).requests ?? [],
  idOf: (item) => String((item as { request_id?: unknown }).request_id ?? ""),
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "request_name", type: "string", label: "Request name" },
    { key: "request_status", type: "string", label: "Status" },
    { key: "owner_email", type: "string", label: "Owner email" },
    { key: "created_time", type: "number", label: "Created time (epoch ms)" },
  ],
  sample: {
    request_id: "100000000000012345",
    request_name: "Mutual NDA",
    request_status: "inprogress",
    owner_email: "owner@example.com",
    created_time: 1731153600000,
  },
});
