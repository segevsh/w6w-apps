import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly added to the Mercury organization: id, name and email.",
  action: userList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "user-1", name: "Dana Rivera", email: "dana@example.com" },
  maxPages: 1,
});
