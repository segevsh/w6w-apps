import type { ActionDefinition } from "@w6w/types";
import { csv, ISSUE_FIELDS, LinearClient } from "../lib/client.ts";

interface Input {
  issueId: string;
  title?: string;
  description?: string;
  assigneeId?: string;
  stateId?: string;
  priority?: number;
  labelIds?: string;
  projectId?: string;
  dueDate?: string;
}

const MUTATION = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

const issueUpdate: ActionDefinition<Input> = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update Issue",
  description: "Update an issue. Only the fields you fill in are sent.",
  // The mutation writes absolute values, so replaying converges.
  idempotent: true,
  params: [
    { key: "issueId", label: "Issue ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "assigneeId", label: "Assignee ID", type: "string", row: "who" },
    { key: "stateId", label: "State ID", type: "string", row: "who" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: 0, label: "No priority" },
        { value: 1, label: "Urgent" },
        { value: 2, label: "High" },
        { value: 3, label: "Medium" },
        { value: 4, label: "Low" },
      ],
    },
    {
      key: "labelIds",
      label: "Label IDs",
      type: "string",
      hint: "Comma-separated UUIDs. REPLACES the issue's current labels.",
    },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "dueDate", label: "Due date", type: "date" },
  ],
  output: [
    { key: "issueUpdate.success", type: "boolean", label: "Updated" },
    { key: "issueUpdate.issue.identifier", type: "string", label: "Identifier" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(MUTATION, {
      id: input.issueId,
      input: {
        title: input.title || undefined,
        description: input.description || undefined,
        assigneeId: input.assigneeId || undefined,
        stateId: input.stateId || undefined,
        priority: input.priority,
        labelIds: csv(input.labelIds),
        projectId: input.projectId || undefined,
        dueDate: input.dueDate || undefined,
      },
    });
  },
};

export default issueUpdate;
