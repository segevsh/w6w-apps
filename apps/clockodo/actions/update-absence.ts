import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId } from "../lib/client.ts";

interface Input {
  id: string;
  dateSince?: string;
  dateUntil?: string;
  type?: string;
  halfDay?: boolean;
  countHours?: number | string;
  status?: string;
  sickNote?: boolean;
  note?: string;
  publicNote?: string;
}

const updateAbsence: ActionDefinition<Input> = {
  key: "update-absence",
  type: "perform",
  resource: "absence",
  title: "Update Absence",
  description:
    "Edit an absence, for example approve or decline it with `status` (PUT /v4/absences/{id}). Only the fields you pass are sent; at least one is required.",
  params: [
    {
      key: "id",
      label: "Absence ID",
      type: "string",
      required: true,
    },
    {
      key: "dateSince",
      label: "Date since",
      type: "string",
      hint: "YYYY-MM-DD.",
    },
    {
      key: "dateUntil",
      label: "Date until",
      type: "string",
      hint: "YYYY-MM-DD; omit for a single day.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "1", label: "Holiday from the quota" },
        { value: "2", label: "Special leaves" },
        { value: "3", label: "Reduction of overtime" },
        { value: "4", label: "Sick day" },
        { value: "5", label: "Sick day of a child" },
        { value: "6", label: "School / further education" },
        { value: "7", label: "Maternity protection" },
        { value: "8", label: "Home office" },
        { value: "9", label: "Work out of office" },
        { value: "10", label: "Special leaves (unpaid)" },
        { value: "11", label: "Sick day (unpaid)" },
        { value: "12", label: "Sick day of a child (unpaid)" },
        { value: "13", label: "Quarantine" },
        { value: "14", label: "Military / alternative service" },
        { value: "15", label: "Sick day (sickness benefit)" },
      ],
    },
    {
      key: "halfDay",
      label: "Half day",
      type: "boolean",
    },
    {
      key: "countHours",
      label: "Hours",
      type: "number",
      hint: "For absences counted in hours.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Enquired" },
        { value: "1", label: "Approved" },
        { value: "2", label: "Declined" },
        { value: "3", label: "Approval cancelled" },
        { value: "4", label: "Cancelled" },
      ],
    },
    {
      key: "sickNote",
      label: "Sick note",
      type: "boolean",
    },
    {
      key: "note",
      label: "Note",
      type: "string",
    },
    {
      key: "publicNote",
      label: "Public note",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated absence" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const fields = compact({
      date_since: input.dateSince,
      date_until: input.dateUntil,
      type: input.type === undefined || input.type === "" ? undefined : Number(input.type),
      half_day: input.halfDay,
      count_hours: input.countHours === undefined || input.countHours === ""
        ? undefined
        : Number(input.countHours),
      status: input.status === undefined || input.status === "" ? undefined : Number(input.status),
      sick_note: input.sickNote,
      note: input.note,
      public_note: input.publicNote,
    });
    if (Object.keys(fields).length === 0) throw new Error("pass at least one field to update");
    const body = await new ClockodoClient(ctx).call(`/v4/absences/${id}`, {
      method: "PUT",
      body: fields,
    });
    return { data: body.data ?? null };
  },
};

export default updateAbsence;
