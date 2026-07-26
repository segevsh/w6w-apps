import type { ActionDefinition } from "@w6w/types";
import { csv, ISSUE_FIELDS, LinearClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  stateId?: string;
  priority?: number;
  labelIds?: string;
  projectId?: string;
  dueDate?: string;
}

const MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description: "Create an issue on a team.",
  // Linear mints a new issue id per call and the mutation takes no client key,
  // so a retry files a duplicate.
  idempotent: false,
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "UUID of the team. `team-get-many` lists them with their keys.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Markdown.",
    },
    { key: "assigneeId", label: "Assignee ID", type: "string", row: "who" },
    {
      key: "stateId",
      label: "State ID",
      type: "string",
      row: "who",
      hint: "Workflow state UUID. Defaults to the team's start state.",
    },
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
    { key: "labelIds", label: "Label IDs", type: "string", hint: "Comma-separated label UUIDs." },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "dueDate", label: "Due date", type: "date", hint: "ISO date, e.g. 2026-08-01." },
  ],
  output: [
    { key: "issueCreate.success", type: "boolean", label: "Created" },
    { key: "issueCreate.issue.id", type: "string", label: "Issue ID" },
    { key: "issueCreate.issue.identifier", type: "string", label: "Identifier (e.g. ENG-42)" },
    { key: "issueCreate.issue.url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(MUTATION, {
      input: {
        teamId: input.teamId,
        title: input.title,
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

export default issueCreate;
