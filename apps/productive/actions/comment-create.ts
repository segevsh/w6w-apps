import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Comment on a task, deal, project, discussion, company or invoice (`POST /comments`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  body: string;
  taskId?: number;
  projectId?: number;
  dealId?: number;
  discussionId?: number;
  companyId?: number;
  invoiceId?: number;
  draft?: boolean;
  hidden?: boolean;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description:
    "Comment on a task, deal, project, discussion, company or invoice (`POST /comments`).",
  idempotent: false,
  params: [
    { "key": "body", "label": "Body", "type": "text", "required": true, "hint": "Comment text." },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "dealId", "label": "Deal ID", "type": "number" },
    { "key": "discussionId", "label": "Discussion ID", "type": "number" },
    { "key": "companyId", "label": "Company ID", "type": "number" },
    { "key": "invoiceId", "label": "Invoice ID", "type": "number" },
    {
      "key": "draft",
      "label": "Draft",
      "type": "boolean",
      "hint": "Save as an unpublished draft.",
    },
    { "key": "hidden", "label": "Hidden", "type": "boolean" },
  ],
  output: resourceOutput("Comment"),

  async execute(input, ctx) {
    const attrs = {
      "body": input.body,
      "task_id": input.taskId,
      "project_id": input.projectId,
      "deal_id": input.dealId,
      "discussion_id": input.discussionId,
      "company_id": input.companyId,
      "invoice_id": input.invoiceId,
      "draft": input.draft,
      "hidden": input.hidden,
    };
    return await new ProductiveClient(ctx).one(`/comments`, {
      method: "POST",
      body: jsonApiBody("comments", attrs),
    });
  },
};

export default commentCreate;
