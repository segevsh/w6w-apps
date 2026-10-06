import type { ActionDefinition } from "@w6w/types";
import { API, peopleCall, type Query } from "../lib/people.ts";

interface Input {
  date?: string;
  dateFormat?: string;
  erecno?: string;
  mapId?: string;
  emailId?: string;
  empId?: string;
}

type Entries = {
  status?: string;
  firstIn?: string;
  lastOut?: string;
  totalHrs?: string;
  allowedToCheckIn?: boolean;
  entries?: unknown[];
};

const attendanceEntriesGet: ActionDefinition<Input> = {
  key: "attendance-entries-get",
  type: "read",
  resource: "attendance",
  title: "Get Attendance Entries",
  description:
    "Get an employee's check-in/check-out entries and totals for a day. Identify the employee with one of erecno / mapId / emailId / empId; with none, the connected user's own entries are returned.",
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      hint:
        "In the ORGANISATION's date format (not ISO unless the org uses it). Defaults to today.",
    },
    {
      key: "dateFormat",
      label: "Response date format",
      type: "string",
      hint: "Optional; defaults to the organisation's date format.",
    },
    { key: "empId", label: "Employee ID", type: "string" },
    { key: "emailId", label: "Employee email", type: "string" },
    { key: "erecno", label: "Employee record id (erecno)", type: "string" },
    { key: "mapId", label: "Mapper ID", type: "string", hint: "Id from a biometric system." },
  ],
  output: [
    { key: "status", type: "string", label: "Attendance status for the day" },
    { key: "firstIn", type: "string", label: "First check-in" },
    { key: "lastOut", type: "string", label: "Last check-out" },
    { key: "totalHrs", type: "string", label: "Total hours (hh:mm)" },
    { key: "allowedToCheckIn", type: "boolean", label: "Whether a check-in is currently allowed" },
    { key: "entries", type: "array", label: "Individual check-in/check-out pairs" },
  ],

  async execute(input, ctx) {
    const query: Query = {
      date: input.date,
      dateFormat: input.dateFormat,
      erecno: input.erecno,
      mapId: input.mapId,
      emailId: input.emailId,
      empId: input.empId,
    };
    const { result } = await peopleCall(ctx, `${API}/attendance/getAttendanceEntries`, { query });
    const r = (result ?? {}) as Entries;
    return {
      status: r.status ?? null,
      firstIn: r.firstIn ?? null,
      lastOut: r.lastOut ?? null,
      totalHrs: r.totalHrs ?? null,
      allowedToCheckIn: r.allowedToCheckIn ?? null,
      entries: r.entries ?? [],
    };
  },
};

export default attendanceEntriesGet;
