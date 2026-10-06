import type { ActionDefinition } from "@w6w/types";
import { buildBody, ref, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/activities` — Create a activity (to-do or phone call).
 */
interface Input {
  description: string;
  date?: string;
  closeDate?: string;
  notes?: string;
  clientId?: number;
  contactIds?: string;
  userIds?: string;
  activityTypeId?: number;
  priority?: number;
  fields?: unknown;
}

const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Create a activity (to-do or phone call).",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Description",
      "type": "string",
      "required": true,
    },
    {
      "key": "date",
      "label": "Date",
      "type": "string",
      "hint": "Date as YYYY-MM-DD.",
    },
    {
      "key": "closeDate",
      "label": "Close date",
      "type": "string",
      "hint": "Set to close the activity. Date as YYYY-MM-DD.",
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "text",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
    },
    {
      "key": "contactIds",
      "label": "Contact IDs",
      "type": "string",
      "hint": "Comma-separated contact IDs, e.g. `3,4`.",
    },
    {
      "key": "userIds",
      "label": "User IDs",
      "type": "string",
      "hint": "Comma-separated Upsales user IDs, e.g. `1,2`.",
    },
    {
      "key": "activityTypeId",
      "label": "Activity type ID",
      "type": "number",
      "hint": "From List Activity Types. The type decides whether it is a to-do or a phone call.",
    },
    {
      "key": "priority",
      "label": "Priority",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created activity" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      date: input.date,
      closeDate: input.closeDate,
      notes: input.notes,
      client: ref(input.clientId),
      contacts: refs(input.contactIds),
      users: refs(input.userIds),
      activityType: ref(input.activityTypeId),
      priority: input.priority,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/activities", { body });
    return { data };
  },
};

export default activityCreate;
