import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId, optInt } from "../lib/client.ts";

interface Input {
  id: string;
  timeSince?: string;
  timeUntil?: string;
  customersId?: number | string;
  projectsId?: number | string;
  subprojectsId?: number | string;
  servicesId?: number | string;
  usersId?: number | string;
  billable?: string;
  text?: string;
  hourlyRate?: number | string;
  lumpsum?: number | string;
}

const updateEntry: ActionDefinition<Input> = {
  key: "update-entry",
  type: "perform",
  resource: "entry",
  title: "Update Time Entry",
  description:
    "Edit a time entry (PUT /v2/entries/{id}). Only the fields you pass are sent (an empty string is treated as not passed); at least one field is required.",
  params: [
    {
      key: "id",
      label: "Entry ID",
      type: "string",
      required: true,
    },
    {
      key: "timeSince",
      label: "Time since",
      type: "string",
    },
    {
      key: "timeUntil",
      label: "Time until",
      type: "string",
    },
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
    },
    {
      key: "projectsId",
      label: "Project ID",
      type: "number",
    },
    {
      key: "subprojectsId",
      label: "Subproject ID",
      type: "number",
    },
    {
      key: "servicesId",
      label: "Service ID",
      type: "number",
    },
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
    {
      key: "billable",
      label: "Billable",
      type: "select",
      options: [{ value: "0", label: "Not billable" }, { value: "1", label: "Billable" }, {
        value: "2",
        label: "Billed",
      }, { value: "12", label: "Billable or billed" }],
    },
    {
      key: "text",
      label: "Text",
      type: "string",
    },
    {
      key: "hourlyRate",
      label: "Hourly rate",
      type: "number",
    },
    {
      key: "lumpsum",
      label: "Lump sum",
      type: "number",
    },
  ],
  output: [
    { key: "entry", type: "object", label: "The updated entry" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const num = (v: unknown) => v === undefined || v === "" ? undefined : Number(v);
    const fields = compact({
      time_since: input.timeSince,
      time_until: input.timeUntil,
      customers_id: optInt(input.customersId, "customersId"),
      projects_id: optInt(input.projectsId, "projectsId"),
      subprojects_id: optInt(input.subprojectsId, "subprojectsId"),
      services_id: optInt(input.servicesId, "servicesId"),
      users_id: optInt(input.usersId, "usersId"),
      billable: num(input.billable),
      text: input.text,
      hourly_rate: num(input.hourlyRate),
      lumpsum: num(input.lumpsum),
    });
    if (Object.keys(fields).length === 0) throw new Error("pass at least one field to update");
    const body = await new ClockodoClient(ctx).call(`/v2/entries/${id}`, {
      method: "PUT",
      body: fields,
    });
    return { entry: body.entry ?? null };
  },
};

export default updateEntry;
