import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  organization: string;
  type?: string;
  perPage?: number;
  page?: number;
}

const organizationGetRepositories: ActionDefinition<Input, unknown[]> = {
  key: "organization-get-repositories",
  type: "search",
  resource: "organization",
  title: "List Organization Repositories",
  description:
    "List an organisation's repositories. Private ones appear only if the connection can see them.",
  params: [
    { key: "organization", label: "Organisation", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
        { value: "forks", label: "Forks" },
        { value: "sources", label: "Sources" },
        { value: "member", label: "Member" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "", type: "array", label: "Repositories" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request<unknown[]>(
      `/orgs/${encodeURIComponent(input.organization)}/repos`,
      { query: { type: unset(input.type), per_page: input.perPage, page: input.page } },
    );
  },
};

export default organizationGetRepositories;
