import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  subject: string;
  question: string;
  rfiManagerId: number;
  assigneeIds?: number[];
  dueDate?: string;
  draft?: boolean;
  isPrivate?: boolean;
}

/**
 * `POST /rest/v1.0/projects/{project_id}/rfis` — the body is `{ rfi: { ... } }`
 * and the documented required fields are `subject`, `question` (an object with a
 * `body`) and `rfi_manager_id`.
 */
const rfiCreate: ActionDefinition<Input> = {
  key: "rfi-create",
  type: "perform",
  resource: "rfi",
  title: "Create RFI",
  description: "Create a Request for Information on a project.",
  idempotent: false,
  params: [
    companyIdParam,
    projectIdParam,
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "question", label: "Question", type: "text", required: true },
    {
      key: "rfiManagerId",
      label: "RFI manager (user ID)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Procore user ID of the RFI manager (see List Project Users).",
    },
    {
      key: "assigneeIds",
      label: "Assignee user IDs",
      type: "array",
      item: { type: "number" },
      hint: "Only admin users can set assignees.",
    },
    { key: "dueDate", label: "Due date", type: "date", hint: "Only admin users can set this." },
    { key: "draft", label: "Create as draft", type: "boolean" },
    { key: "isPrivate", label: "Private", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "RFI ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const rfi: Record<string, unknown> = {
      subject: input.subject,
      question: { body: input.question },
      rfi_manager_id: input.rfiManagerId,
    };
    if (input.assigneeIds?.length) rfi.assignee_ids = input.assigneeIds;
    if (input.dueDate) rfi.due_date = input.dueDate;
    if (input.draft !== undefined) rfi.draft = input.draft;
    if (input.isPrivate !== undefined) rfi.private = input.isPrivate;
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/rfis`,
      { method: "POST", body: { rfi }, companyId: input.companyId },
    );
    return reply.data;
  },
};

export default rfiCreate;
