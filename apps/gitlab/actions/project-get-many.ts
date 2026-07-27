import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  membership?: boolean;
  search?: string;
  perPage?: number;
  page?: number;
}

/**
 * Lists projects. Defaults to `membership=true` — the projects the credential
 * belongs to — because the unfiltered endpoint returns every public project on
 * the instance, which is never what a workflow wants.
 */
const projectGetMany: ActionDefinition<Input> = {
  key: "project-get-many",
  type: "read",
  resource: "project",
  title: "Get Many Projects",
  description: "List projects the connected account is a member of, optionally filtered by search.",
  params: [
    {
      key: "membership",
      label: "Only my projects",
      type: "boolean",
      default: true,
      hint:
        "Restrict to projects the credential is a member of. Turn off to search all visible projects.",
    },
    { key: "search", label: "Search", type: "string", hint: "Filter by name or path." },
    ...pagination,
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "path_with_namespace", type: "string", label: "Full path" },
    { key: "web_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects`, {
      query: {
        membership: input.membership ?? true,
        search: unset(input.search),
        per_page: input.perPage,
        page: input.page,
      },
    });
  },
};

export default projectGetMany;
