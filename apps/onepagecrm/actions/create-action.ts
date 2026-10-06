import type { ActionDefinition } from "@w6w/types";
import { compact, OnePageClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  text: string;
  status?: string;
  date?: string;
  exactTime?: number;
  assigneeId?: string;
}

/**
 * `POST /actions` — create a next action on a contact (`contact_id` and `text` required; `text`
 * max 140 characters). A contact holds one ASAP action per assignee: creating a second demotes the
 * existing one to a dated action for today. Adding an ASAP action to a contact that already has one
 * for the same user can answer HTTP 409 (conflict). Not idempotent.
 */
const createAction: ActionDefinition<Input> = {
  key: "create-action",
  type: "perform",
  resource: "action",
  title: "Create Next Action",
  description: "Create a next action (follow-up step) on a contact.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "text",
      label: "Action",
      type: "string",
      required: true,
      validation: { maxLength: 140 },
      hint: "The step to take, up to 140 characters.",
    },
    {
      key: "status",
      label: "Type",
      type: "select",
      default: "date",
      options: ["asap", "date", "date_time", "waiting", "queued", "queued_with_date"]
        .map((v) => ({ value: v, label: v })),
      hint: "Defaults to `date` (due on a date, today if none given).",
    },
    {
      key: "date",
      label: "Due date",
      type: "string",
      hint: "YYYY-MM-DD, for types date, date_time or queued_with_date.",
    },
    {
      key: "exactTime",
      label: "Exact time",
      type: "number",
      hint: "Unix epoch seconds, for type date_time.",
      validation: { integer: true },
    },
    {
      key: "assigneeId",
      label: "Assignee ID",
      type: "string",
      hint: "Defaults to the calling user.",
    },
  ],
  output: [{ key: "action", type: "object", label: "The created action" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data("/actions", {
      method: "POST",
      body: compact({
        contact_id: input.contactId,
        text: input.text,
        status: input.status,
        date: input.date,
        exact_time: input.exactTime,
        assignee_id: input.assigneeId,
      }),
    });
  },
};

export default createAction;
