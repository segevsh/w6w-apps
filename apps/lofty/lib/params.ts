import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Lofty actions.
 *
 * Every label, type and constraint here mirrors the parameter list in the
 * OpenAPI 3.0.1 specification embedded in <https://api.lofty.com/docs/>
 * (extracted and verified 2026-09-22). Where the spec truncates a value list,
 * the note says so rather than inventing the remainder.
 */

/** The offset/limit pair the paged Lofty list endpoints share. */
export function paginationParams(defaultLimit: number, limitHint: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: limitHint,
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Zero-based index of the first record to return. Defaults to 0.",
    },
  ];
}

/** `leadId` — the handle nearly every Lofty sub-resource hangs off. */
export const leadIdParam: Param = {
  key: "leadId",
  label: "Lead ID",
  type: "number",
  required: true,
  hint: "The `leadId` from a List Leads or Create Lead result. e.g. 651095960136641.",
};

/** `deadline` on a task — milliseconds since the Unix epoch, UTC. */
export const deadlineParam: Param = {
  key: "deadline",
  label: "Deadline (epoch ms)",
  type: "number",
  required: true,
  hint: "Milliseconds since the Unix epoch, UTC. e.g. 1508580010000.",
};

/** The `sort` order on List Leads. The spec truncates the full set. */
export const leadSortParam: Param = {
  key: "sort",
  label: "Sort order",
  type: "string",
  placeholder: "CreateTime",
  hint: "One of Default, LastContact, LastCall, LastEmail, LastActivity, CreateTime, DeleteTime, " +
    "AssignTime and others. The published list is truncated, so the field is free text.",
};

/**
 * `finishFlag` — on an update it completes the task and ignores the other
 * fields, which is why it survives alongside the "partially updates" wording
 * even though the spec marks the rest of the body required.
 */
export const finishFlagParam: Param = {
  key: "finishFlag",
  label: "Finished",
  type: "boolean",
  hint: "On update, `true` marks the task completed and ignores the other body fields.",
};
