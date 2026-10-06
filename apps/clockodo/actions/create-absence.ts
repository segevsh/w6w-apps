import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, optInt, reqString } from "../lib/client.ts";

interface Input {
  dateSince: string;
  dateUntil?: string;
  type: string;
  usersId?: number | string;
  halfDay?: boolean;
  countHours?: number | string;
  status?: string;
  sickNote?: boolean;
  note?: string;
  publicNote?: string;
}

const createAbsence: ActionDefinition<Input> = {
  key: "create-absence",
  type: "perform",
  resource: "absence",
  title: "Create Absence",
  description:
    "Record an absence (POST /v4/absences). `dateSince` and `type` are required; `usersId` defaults to the authenticated user.",
  params: [
    {
      key: "dateSince",
      label: "Date since",
      type: "string",
      required: true,
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
      required: true,
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
      key: "usersId",
      label: "User ID",
      type: "number",
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
    { key: "data", type: "object", label: "The created absence" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const type = Number(reqString(String(input.type ?? ""), "type"));
    if (!Number.isInteger(type)) throw new Error("type must be a number from 1 to 15");
    const body = await new ClockodoClient(ctx).call("/v4/absences", {
      body: compact({
        date_since: reqString(input.dateSince, "dateSince"),
        date_until: input.dateUntil,
        type,
        users_id: optInt(input.usersId, "usersId"),
        half_day: input.halfDay,
        count_hours: input.countHours === undefined || input.countHours === ""
          ? undefined
          : Number(input.countHours),
        status: input.status === undefined || input.status === ""
          ? undefined
          : Number(input.status),
        sick_note: input.sickNote,
        note: input.note,
        public_note: input.publicNote,
      }),
    });
    return { data: body.data ?? null };
  },
};

export default createAbsence;
