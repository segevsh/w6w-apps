import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool, toCsv } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/** `POST /v3/projects` — add a new project. */
interface Input {
  name: string;
  projectCode?: string;
  clientId?: number;
  color?: string;
  notes?: string;
  tags?: string[] | string;
  billable?: boolean;
  status?: number;
  budgetType?: number;
  budgetTotal?: number;
  defaultHourlyRate?: string;
  extraFields?: unknown;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Add a new project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 200 } },
    { key: "projectCode", label: "Project code", type: "string", validation: { maxLength: 32 } },
    { key: "clientId", label: "Client ID", type: "number", validation: { integer: true } },
    { key: "color", label: "Color (hex)", type: "string", placeholder: "0095D7" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    { key: "billable", label: "Billable", type: "boolean", default: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint:
        "If both Status and a Stage ID (via Additional fields) are provided, the Stage ID wins.",
      options: [
        { value: 0, label: "Draft" },
        { value: 1, label: "Tentative" },
        { value: 2, label: "Confirmed" },
        { value: 3, label: "Completed" },
        { value: 4, label: "Canceled" },
      ],
    },
    {
      key: "budgetType",
      label: "Budget type",
      type: "select",
      options: [
        { value: 1, label: "Total hours" },
        { value: 2, label: "Total fee" },
        { value: 3, label: "Time & materials" },
      ],
    },
    {
      key: "budgetTotal",
      label: "Budget total",
      type: "number",
      hint: "Only used for Total hours / Total fee budgets.",
    },
    { key: "defaultHourlyRate", label: "Default hourly rate", type: "string" },
    extraFieldsParam(
      "Use it for `stage_id`, `rate_card_id`, `project_manager`, or `project_team` — the team " +
        "field takes a `{set|add|del}` instruction object, not a plain array (see README).",
    ),
  ],
  output: [
    { key: "project_id", type: "number", label: "New project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const tags = toCsv(input.tags)?.split(",");
    const body = {
      ...compact({
        name: input.name,
        project_code: input.projectCode,
        client_id: input.clientId,
        color: input.color,
        notes: input.notes,
        tags,
        non_billable: input.billable === undefined ? undefined : intBool(!input.billable),
        status: input.status,
        budget_type: input.budgetType,
        budget_total: input.budgetTotal,
        default_hourly_rate: input.defaultHourlyRate,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/projects", { method: "POST", body });
  },
};

export default projectCreate;
