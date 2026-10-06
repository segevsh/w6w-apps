import type { Param } from "@w6w/types";

/** `id`-range filters every collection documents. */
export const idFilters: Param[] = [
  { key: "idList", label: "ID list", type: "string", hint: "Comma-separated ids." },
  { key: "idGreaterThan", label: "ID greater than", type: "number", hint: "Non-inclusive." },
  { key: "idLessThan", label: "ID less than", type: "number", hint: "Non-inclusive." },
];

/** `<field>After` / `<field>Before` datetime filters, e.g. `createdAtAfter`. */
export function timeFilters(field: "createdAt" | "updatedAt" | "sentAt"): Param[] {
  const label = field === "createdAt" ? "Created" : field === "updatedAt" ? "Updated" : "Sent";
  return [
    {
      key: `${field}After`,
      label: `${label} after`,
      type: "string",
      placeholder: "2026-01-01T00:00:00-05:00",
      hint: "ISO 8601 with a time-zone offset. Non-inclusive.",
    },
    {
      key: `${field}Before`,
      label: `${label} before`,
      type: "string",
      hint: "ISO 8601 with a time-zone offset. Non-inclusive.",
    },
  ];
}

export const nameFilter = (what: string): Param => ({
  key: "name",
  label: "Name",
  type: "string",
  hint: `Exact match on the ${what} name.`,
});
