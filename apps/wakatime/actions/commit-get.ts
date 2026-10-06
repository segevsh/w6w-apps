import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  project: string;
  hash: string;
  branch?: string;
}

/** `GET /api/v1/users/current/projects/${seg(input.project)}/commits/${seg(input.hash)}` */
const commitGet: ActionDefinition<Input> = {
  key: "commit-get",
  type: "read",
  resource: "commit",
  title: "Get Commit",
  description: "One commit of a project with the coding time spent on it.",
  params: [
    {
      key: "project",
      label: "Project",
      type: "string",
      required: true,
      hint: "The project name from List Projects.",
    },
    {
      key: "hash",
      label: "Commit hash",
      type: "string",
      required: true,
      hint: "The full revision-control hash.",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Defaults to the repository's default branch.",
    },
  ],
  output: [
    { key: "commit", type: "object", label: "The commit" },
    { key: "project", type: "object", label: "The project" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request(
      "GET",
      `${USER}/projects/${seg(input.project)}/commits/${seg(input.hash)}`,
      {
        query: {
          branch: input.branch,
        },
      },
    );
  },
};

export default commitGet;
