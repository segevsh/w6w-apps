import type { ActionDefinition } from "@w6w/types";
import { enc, listResult, ProjectsClient } from "../lib/client.ts";
import { page, perPage, portalId } from "../lib/params.ts";

interface Input {
  portalId: string;
  userType?: string;
  viewType?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Portal Users",
  description:
    "List the users of a portal. Filter by user type (users, client users, contacts, resources) and active/inactive.",
  params: [
    portalId,
    {
      key: "userType",
      label: "User Type",
      type: "select",
      hint: "1 users, 2 client users, 3 client contacts, 6 resources.",
      options: [{ value: "1", label: "Users" }, { value: "2", label: "Client users" }, {
        value: "3",
        label: "Client contacts",
      }, { value: "6", label: "Resources" }],
    },
    {
      key: "viewType",
      label: "Status",
      type: "select",
      hint: "0 inactive, 1 active.",
      options: [{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }],
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint:
        "e.g. `alphabetical:asc` (also last_accessed_time, role, profile, added_time; asc|desc).",
    },
    page,
    perPage,
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "hasNext", type: "boolean", label: "More pages available" },
    { key: "page", type: "number", label: "Page number returned" },
  ],

  async execute(input, ctx) {
    const client = new ProjectsClient(ctx);
    return listResult(
      await client.get(`/portal/${enc(input.portalId)}/users`, {
        type: input.userType,
        view_type: input.viewType,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      }),
      "users",
    );
  },
};

export default userList;
