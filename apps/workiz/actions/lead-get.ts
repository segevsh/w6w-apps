import type { ActionDefinition } from "@w6w/types";
import { encodeId, unwrapList, WorkizClient } from "../lib/client.ts";
import type { Lead } from "../lib/schema.ts";

/**
 * `GET /lead/get/{UUID}/` — one lead by its UUID.
 *
 * The response is an **array containing one Lead**, not the record itself —
 * unlike `/team/get/{USER_ID}`, which answers an object. The array is collapsed
 * here, and an empty array (a UUID that matches nothing) becomes `null`.
 *
 * `UUID` is the lead's unique id, the same value the update/convert/assign
 * calls take and the one `lead-create` returns.
 */
interface Input {
  uuid: string;
}

const leadGet: ActionDefinition<Input, Lead | null> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Read one Workiz lead by its UUID.",
  params: [
    {
      key: "uuid",
      label: "Lead UUID",
      type: "string",
      required: true,
      hint: "The lead's unique id, as returned by List Leads or Create Lead.",
    },
  ],
  output: [
    { key: "UUID", type: "string", label: "Lead UUID" },
    { key: "SerialId", type: "number", label: "Serial id" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "Company", type: "string", label: "Company" },
    { key: "Email", type: "string", label: "Email" },
    { key: "Phone", type: "string", label: "Phone" },
    { key: "Address", type: "string", label: "Address" },
    { key: "City", type: "string", label: "City" },
    { key: "State", type: "string", label: "State" },
    { key: "Status", type: "string", label: "Status" },
    { key: "SubStatus", type: "string", label: "Sub-status" },
    { key: "LeadDateTime", type: "string", label: "Scheduled start" },
    { key: "LeadEndDateTime", type: "string", label: "Scheduled end" },
    { key: "LeadNotes", type: "string", label: "Lead notes" },
    { key: "Team", type: "array", label: "Assigned team" },
    { key: "ClientId", type: "number", label: "Client id" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json(`/lead/get/${encodeId(input.uuid)}/`);
    return unwrapList<Lead>(body)[0] ?? null;
  },
};

export default leadGet;
