import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath, unset } from "../lib/client.ts";
import { pagination, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  orderBy?: string;
  sort?: string;
  perPage?: number;
  page?: number;
}

const releaseGetMany: ActionDefinition<Input> = {
  key: "release-get-many",
  type: "read",
  resource: "release",
  title: "Get Many Releases",
  description: "List a project's releases.",
  params: [
    projectId,
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      options: [
        { value: "released_at", label: "Released at" },
        { value: "created_at", label: "Created at" },
      ],
      row: "sort",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
      row: "sort",
    },
    ...pagination,
  ],
  output: [
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "name", type: "string", label: "Name" },
    { key: "released_at", type: "string", label: "Released at" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects/${projectPath(input.projectId)}/releases`, {
      query: {
        order_by: unset(input.orderBy),
        sort: unset(input.sort),
        per_page: input.perPage,
        page: input.page,
      },
    });
  },
};

export default releaseGetMany;
