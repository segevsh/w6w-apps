import type { ActionDefinition } from "@w6w/types";
import { asJson, asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/tasks/` — Create a task. `taskType`, `relatedContacts`, `relatedCompanies` and `deals` take Clientify resource URLs; list task types with the Task Types action. `type` and `status` ids are deprecated by Clientify and are not offered.
 */
interface Input {
  name: string;
  dueDate?: string;
  assignedTo?: string;
  owner?: string;
  description?: string;
  remarks?: string;
  taskType?: string;
  startDatetime?: string;
  endDatetime?: string;
  location?: string;
  relatedContacts?: unknown;
  relatedCompanies?: unknown;
  deals?: unknown;
  guestUsers?: unknown;
  extra?: unknown;
}

const taskCreate: ActionDefinition<Input, unknown> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a task. `taskType`, `relatedContacts`, `relatedCompanies` and `deals` take Clientify resource URLs; list task types with the Task Types action. `type` and `status` ids are deprecated by Clientify and are not offered.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
      hint: "ISO 8601 with offset, e.g. 2026-11-28T13:00:00+02:00.",
    },
    {
      key: "assignedTo",
      label: "Assigned to",
      type: "string",
      hint: "Email of the user the task is assigned to.",
    },
    { key: "owner", label: "Owner", type: "string", hint: "Email of the owning user." },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Shown only for videoconferences, where it stores the call URL.",
    },
    { key: "remarks", label: "Remarks", type: "text" },
    {
      key: "taskType",
      label: "Task type URL",
      type: "string",
      hint: "https://api.clientify.net/v1/tasks/types/<id>/",
    },
    { key: "startDatetime", label: "Start", type: "datetime" },
    { key: "endDatetime", label: "End", type: "datetime" },
    { key: "location", label: "Location", type: "string" },
    {
      key: "relatedContacts",
      label: "Related contacts",
      type: "json",
      hint: "JSON array of contact URLs.",
    },
    {
      key: "relatedCompanies",
      label: "Related companies",
      type: "json",
      hint: "JSON array of company URLs.",
    },
    { key: "deals", label: "Related deals", type: "json", hint: "JSON array of deal URLs." },
    { key: "guestUsers", label: "Guest users", type: "json", hint: "JSON array of user URLs." },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Task name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/tasks/`, {
      method: "POST",
      body: compact({
        ...asObject(input.extra, "extra"),
        name: input.name,
        due_date: input.dueDate,
        assigned_to: input.assignedTo,
        owner: input.owner,
        description: input.description,
        remarks: input.remarks,
        task_type: input.taskType,
        start_datetime: input.startDatetime,
        end_datetime: input.endDatetime,
        location: input.location,
        related_contacts: asJson(input.relatedContacts),
        related_companies: asJson(input.relatedCompanies),
        deals: asJson(input.deals),
        guest_users: asJson(input.guestUsers),
      }),
    });
  },
};

export default taskCreate;
