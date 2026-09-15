import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient, intBool } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/**
 * `PATCH /v3/projects/{project_id}` — update a project's details.
 *
 * The project TEAM is managed through `project_team` (via Additional
 * fields), a `{set, add, del}` instruction object rather than a plain array
 * — deliberately not exposed as a typed param here:
 *
 *   - `set` REPLACES the entire team. Every current member not in the list is
 *     removed, which **cascade-deletes** their allocations and logged time.
 *   - `add` adds members without touching anyone else.
 *   - `del` removes the listed `people_id`s, with the same cascade-delete.
 *
 * A generated form cannot safely represent "this array secretly deletes
 * things," so it stays in `extraFields` where the caller supplies the exact
 * vendor shape and reads the CAUTION in this app's README first.
 */
interface Input {
  project_id: number;
  name?: string;
  clientId?: number;
  color?: string;
  notes?: string;
  billable?: boolean;
  status?: number;
  active?: boolean;
  extraFields?: unknown;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("project_id", "Project ID"),
    { key: "name", label: "Name", type: "string" },
    { key: "clientId", label: "Client ID", type: "number", validation: { integer: true } },
    { key: "color", label: "Color (hex)", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "billable", label: "Billable", type: "boolean" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 0, label: "Draft" },
        { value: 1, label: "Tentative" },
        { value: 2, label: "Confirmed" },
        { value: 3, label: "Completed" },
        { value: 4, label: "Canceled" },
      ],
    },
    { key: "active", label: "Active", type: "boolean" },
    extraFieldsParam(
      "Use it for `project_team` (see this action's description for the set/add/del CAUTION), " +
        "`stage_id`, `rate_card_id`, `budget_type`, `budget_total`.",
    ),
  ],
  output: [
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        name: input.name,
        client_id: input.clientId,
        color: input.color,
        notes: input.notes,
        non_billable: input.billable === undefined ? undefined : intBool(!input.billable),
        status: input.status,
        active: intBool(input.active),
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/projects/${input.project_id}`, {
      method: "PATCH",
      body,
    });
  },
};

export default projectUpdate;
