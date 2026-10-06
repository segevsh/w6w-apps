import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a project (`POST /projects`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  projectTypeId?: string | number;
  companyId?: number;
  projectManagerId?: number;
  workflowId?: number;
  projectColorId?: number;
  customFields?: unknown;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project (`POST /projects`).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true, "hint": "Project name." },
    {
      "key": "projectTypeId",
      "label": "Project type",
      "type": "select",
      "hint": "1 = internal overhead, 2 = billable client work.",
      "options": [{ "value": 1, "label": "Internal" }, { "value": 2, "label": "Client" }],
    },
    {
      "key": "companyId",
      "label": "Company ID",
      "type": "number",
      "hint": "The client company (client projects).",
    },
    {
      "key": "projectManagerId",
      "label": "Project manager ID",
      "type": "number",
      "hint": "Person id of the project manager.",
    },
    {
      "key": "workflowId",
      "label": "Workflow ID",
      "type": "number",
      "hint": "Workflow whose statuses tasks use.",
    },
    { "key": "projectColorId", "label": "Project color ID", "type": "number" },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint": "JSON object of custom field values, keyed by custom field id.",
    },
  ],
  output: resourceOutput("Project"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "project_type_id": input.projectTypeId,
      "company_id": input.companyId,
      "project_manager_id": input.projectManagerId,
      "workflow_id": input.workflowId,
      "project_color_id": input.projectColorId,
      "custom_fields": toObject(input.customFields, "custom fields"),
    };
    return await new ProductiveClient(ctx).one(`/projects`, {
      method: "POST",
      body: jsonApiBody("projects", attrs),
    });
  },
};

export default projectCreate;
