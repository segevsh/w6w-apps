import type { Param } from "@w6w/types";

export function checkParams(verb: string): Param[] {
  return [
    { key: "id", label: "Registrant ID", type: "string", hint: "Use this or Display ID." },
    {
      key: "displayId",
      label: "Registrant display ID",
      type: "string",
      hint: "The id on the attendee's ticket. Use this or Registrant ID.",
    },
    {
      key: "date",
      label: "Timestamp",
      type: "string",
      hint: `Optional ISO 8601 time to record for the ${verb} (e.g. 2026-05-02T22:32:22Z).`,
    },
  ];
}

/** The request body: exactly one of `id` / `displayId`, plus the optional `date`. */
export function checkBody(input: Record<string, unknown>): Record<string, unknown> {
  const id = String(input.id ?? "").trim();
  const displayId = String(input.displayId ?? "").trim();
  if ((id === "") === (displayId === "")) {
    throw new Error("give exactly one of Registrant ID or Registrant display ID");
  }
  const body: Record<string, unknown> = id
    ? { id: Number.isNaN(Number(id)) ? id : Number(id) }
    : { displayId };
  const date = String(input.date ?? "").trim();
  if (date) body.date = date;
  return body;
}
