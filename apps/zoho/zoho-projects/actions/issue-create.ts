import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  name: string;
  description?: string;
  flag?: string;
  assigneeZpuid?: string;
  statusId?: string;
  dueDate?: string;
}

const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description: "Create an issue (bug) in a project.",
  idempotent: false,
  params: [
    portalId,
    projectId,
    { key: "name", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "flag",
      label: "Visibility",
      type: "select",
      hint: "Internal or External.",
      options: [{ value: "Internal", label: "Internal" }, { value: "External", label: "External" }],
    },
    { key: "assigneeZpuid", label: "Assignee ZPUID", type: "string" },
    { key: "statusId", label: "Status ID", type: "string" },
    {
      key: "dueDate",
      label: "Due Date",
      type: "string",
      hint: "ISO 8601, e.g. 2026-12-31T00:00:00+05:30.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/issues`,
      {
        body: compact({
          name: input.name,
          description: input.description,
          flag: input.flag,
          assignee: input.assigneeZpuid ? { zpuid: input.assigneeZpuid } : undefined,
          status: input.statusId ? { id: input.statusId } : undefined,
          due_date: input.dueDate,
        }),
      },
    );
    return { item: body };
  },
};

export default issueCreate;
