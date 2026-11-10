export const leaveOutput = [
  { key: "Id", type: "number" as const, label: "Leave request ID" },
  { key: "Employee", type: "number" as const, label: "Employee ID" },
  { key: "DateStart", type: "string" as const, label: "First day" },
  { key: "DateEnd", type: "string" as const, label: "Last day" },
  { key: "Status", type: "number" as const, label: "Status (integer lookup)" },
  { key: "Modified", type: "string" as const, label: "Modified at" },
];

export const leaveSample = {
  Id: 15,
  Employee: 42,
  DateStart: "2026-12-01T00:00:00+00:00",
  DateEnd: "2026-12-03T00:00:00+00:00",
  Status: 0,
  Modified: "2026-11-09T10:00:00+00:00",
};
