import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/**
 * `GET` list with `sort_by=id&sort_direction=DESC`: highest id (newest) first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each team member newly added to Salesloft.",
  action: userList,
  input: () => ({ sortBy: "id", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 61, name: "Ada Lovelace", email: "ada@example.test" },
  maxPages: 1,
});
