import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listPeople from "../actions/list-people.ts";

export default pollFromListAction({
  key: "new-person",
  title: "New Person",
  description: "The run gets each newly created Outseta person (newest first).",
  action: listPeople,
  input: () => ({ limit: 25, orderBy: "Created DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { Uid?: unknown }).Uid ?? ""),
  output: [
    { key: "Uid", type: "string", label: "Person Uid" },
    { key: "Email", type: "string", label: "Email" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: {
    Uid: "Dq2k8Xm0",
    Email: "ada@example.com",
    FirstName: "Ada",
    LastName: "Lovelace",
    Created: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});
