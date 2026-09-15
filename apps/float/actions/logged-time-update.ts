import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `PATCH /v3/logged-time/{logged_time_id}` — modify a logged time entry.
 *
 * Unlike create, update answers a single object, not an array. `id` is
 * still a string (see `actions/logged-time-get.ts`).
 */
interface Input {
  logged_time_id: string;
  hours?: number;
  date?: string;
  notes?: string;
  extraFields?: unknown;
}

const loggedTimeUpdate: ActionDefinition<Input> = {
  key: "logged-time-update",
  type: "perform",
  resource: "logged-time",
  title: "Update Logged Time",
  description: "Modify an existing logged time entry. Only the fields provided are changed.",
  idempotent: true,
  params: [
    {
      key: "logged_time_id",
      label: "Logged time ID",
      type: "string",
      required: true,
      hint: "A string ID (not an integer). Take it from a list response's logged_time_id field.",
    },
    { key: "hours", label: "Hours", type: "number", validation: { min: 0, max: 24 } },
    { key: "date", label: "Date", type: "date" },
    { key: "notes", label: "Notes", type: "text", validation: { maxLength: 1500 } },
    extraFieldsParam("Use it for `project_id`, `phase_id`, `task_id`, or `task_name`."),
  ],
  output: [
    { key: "logged_time_id", type: "string", label: "Logged time ID" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({ hours: input.hours, date: input.date, notes: input.notes }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(
      `/logged-time/${encodeURIComponent(input.logged_time_id)}`,
      { method: "PATCH", body },
    );
  },
};

export default loggedTimeUpdate;
