export const timesheetOutput = [
  { key: "Id", type: "number" as const, label: "Timesheet ID" },
  { key: "Employee", type: "number" as const, label: "Employee ID" },
  { key: "Date", type: "string" as const, label: "Date" },
  { key: "StartTime", type: "number" as const, label: "Start time (Unix)" },
  { key: "EndTime", type: "number" as const, label: "End time (Unix)" },
  { key: "TotalTime", type: "number" as const, label: "Total hours" },
  { key: "Modified", type: "string" as const, label: "Modified at" },
];

export const timesheetSample = {
  Id: 310,
  Employee: 42,
  Date: "2026-11-09T00:00:00+00:00",
  StartTime: 1794128400,
  EndTime: 1794157200,
  TotalTime: 8,
  Modified: "2026-11-09T17:00:00+00:00",
};

export const timesheetItems = (result: unknown) => (result as { items?: unknown[] }).items ?? [];
