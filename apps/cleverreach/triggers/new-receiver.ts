import { pollFromListAction } from "../../_shared/poll/mod.ts";
import receiverList from "../actions/receiver-list.ts";

/**
 * `GET /groups/{group_id}/receivers?order_by=registered desc` (https://rest.cleverreach.com/explorer/v3/ ;
 * `order_by` is "field to order by, append 'asc' or 'desc' with a space"). Receivers imported with an
 * old `registered` stamp sort by that stamp, so only receivers registered recently are seen.
 */
export default pollFromListAction<{ groupId: string }>({
  key: "new-receiver",
  title: "New Receiver",
  description:
    "The run gets each receiver newly registered in the chosen group (ordered by `registered desc`).",
  action: receiverList,
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      hint: "The CleverReach group (receiver list) to watch. Find it with List Groups.",
    },
  ],
  input: ({ groupId }) => ({ groupId, pageSize: 100, orderBy: "registered desc" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Receiver ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "registered", type: "number", label: "Registered at (Unix seconds)" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "source", type: "string", label: "Source" },
  ],
  sample: {
    id: 1234567,
    email: "ada@example.com",
    registered: 1762689600,
    active: true,
    source: "Website form",
  },
  maxPages: 1,
});
