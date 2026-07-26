import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  username: string;
  type?: string;
  sort?: string;
  perPage?: number;
  page?: number;
}

const userGetRepositories: ActionDefinition<Input, unknown[]> = {
  key: "user-get-repositories",
  type: "search",
  resource: "user",
  title: "List User Repositories",
  description: "List the public repositories a user owns.",
  params: [
    { key: "username", label: "Username", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "owner",
      options: [
        { value: "owner", label: "Owned" },
        { value: "all", label: "All" },
        { value: "member", label: "Member of" },
      ],
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      default: "full_name",
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "pushed", label: "Pushed" },
        { value: "full_name", label: "Name" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "", type: "array", label: "Repositories" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request<unknown[]>(
      `/users/${encodeURIComponent(input.username)}/repos`,
      {
        query: {
          type: unset(input.type),
          sort: unset(input.sort),
          per_page: input.perPage,
          page: input.page,
        },
      },
    );
  },
};

export default userGetRepositories;
