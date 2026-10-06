import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/projects/{projectId}/jobs` — list translation jobs in a project.
 */
interface Input {
  projectId: string;
  branch?: string;
  state?: string;
  ownedBy?: string;
  assignedTo?: string;
  updatedSince?: string;
  page?: number;
  perPage?: number;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List translation jobs in a project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "draft", label: "draft" },
        { value: "in_progress", label: "in_progress" },
        { value: "completed", label: "completed" },
      ],
    },
    { key: "ownedBy", label: "Owned by (user ID)", type: "string" },
    { key: "assignedTo", label: "Assigned to (user ID)", type: "string" },
    { key: "updatedSince", label: "Updated since", type: "datetime" },
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/projects/${encodeId(input.projectId)}/jobs`, {
      branch: input.branch,
      state: input.state,
      owned_by: input.ownedBy,
      assigned_to: input.assignedTo,
      updated_since: input.updatedSince,
      page: input.page,
      per_page: input.perPage,
    });
  },
};

export default jobList;
