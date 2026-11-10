import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listSubscribersGet from "../actions/list-subscribers-get.ts";

interface Params {
  listId: string;
}

export default pollFromListAction<Params>({
  key: "new-subscriber",
  title: "New Subscriber",
  description:
    "The run gets each subscriber who becomes active on a Campaign Monitor list (sorted by the date they entered the state, newest first).",
  action: listSubscribersGet as unknown as ActionDefinition,
  input: (p) => ({
    listId: p.listId,
    state: "active",
    pageSize: 100,
    orderField: "date",
    orderDirection: "desc",
  }),
  items: (r) => (r as { Results?: unknown[] }).Results ?? [],
  idOf: (v) => String((v as { EmailAddress?: unknown }).EmailAddress ?? ""),
  params: [{ key: "listId", label: "List ID", type: "string", required: true }],
  output: [
    { key: "EmailAddress", type: "string", label: "Email address" },
    { key: "Name", type: "string", label: "Name" },
    { key: "Date", type: "string", label: "Date the subscriber became active" },
    { key: "State", type: "string", label: "State" },
    { key: "CustomFields", type: "array", label: "Custom fields" },
  ],
  sample: {
    EmailAddress: "ada@example.com",
    Name: "Ada Lovelace",
    Date: "2026-11-09 09:00:00",
    State: "Active",
    CustomFields: [],
  },
  maxPages: 1,
});
