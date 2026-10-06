import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  project: string;
  author?: string;
  branch?: string;
  page?: number;
}

/** `GET /api/v1/users/current/projects/${seg(input.project)}/commits` */
const commitList: ActionDefinition<Input> = {
  key: "commit-list",
  type: "read",
  resource: "commit",
  title: "List Commits",
  description:
    "Commits of a project with the coding time spent on each. Paged: pass the returned next_page as Page.",
  params: [
    {
      key: "project",
      label: "Project",
      type: "string",
      required: true,
      hint: "The project name from List Projects.",
    },
    { key: "author", label: "Author", type: "string", hint: "Only commits by this username." },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Defaults to the repository's default branch.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number, starting at 1.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "commits", type: "array", label: "Commits" },
    { key: "project", type: "object", label: "The project" },
    { key: "branch", type: "string", label: "Branch read" },
    { key: "page", type: "number", label: "Current page" },
    { key: "next_page", type: "number", label: "Next page number, or null on the last page" },
    { key: "total", type: "number", label: "Total commits" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/projects/${seg(input.project)}/commits`, {
      query: {
        author: input.author,
        branch: input.branch,
        page: input.page,
      },
    });
  },
};

export default commitList;
