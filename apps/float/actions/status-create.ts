import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam, repeatEndDateParam, repeatStateParam } from "../lib/params.ts";

/**
 * `POST /v3/status` — add a new status.
 *
 * Two things this action's output shape depends on, both verified against
 * the vendor's own Swagger document:
 *
 *  - **The response is `{"status": [...]}`, an array wrapped in an object
 *    keyed `status`** — every other Float create answers the bare created
 *    object. The reason: if the new status's date range overlaps an
 *    existing status for the same person, Float deletes the old one and
 *    returns it ALONGSIDE the new one in the same array. A plain "create"
 *    can therefore produce a delete as a side effect.
 *  - **`status_type_id` has no listing endpoint.** The vendor's own docs
 *    describe it as "the status type ID set in the UI" — 1 = Home, 2 =
 *    Travel, 3 = Custom, 4 = Office are the shipped defaults, but a team can
 *    add its own in Admin Settings, and nothing in this API enumerates them.
 */
interface Input {
  statusTypeId: number;
  peopleId: number;
  startDate: string;
  endDate: string;
  statusName?: string;
  repeat_state?: number;
  repeat_end_date?: string;
  extraFields?: unknown;
}

const statusCreate: ActionDefinition<Input> = {
  key: "status-create",
  type: "perform",
  resource: "status",
  title: "Create Status",
  description:
    "Add a new status. If the date range overlaps an existing status for this person, Float " +
    "deletes it and returns both records.",
  idempotent: false,
  params: [
    {
      key: "statusTypeId",
      label: "Status type ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Defaults are 1 = Home, 2 = Travel, 3 = Custom, 4 = Office, but the API exposes no " +
        "endpoint to list the exact set for this team — check Admin Settings in the Float UI.",
    },
    {
      key: "peopleId",
      label: "Person ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    {
      key: "statusName",
      label: "Status name",
      type: "string",
      hint: "Only used for a Custom status type; every other type derives its own name.",
    },
    repeatStateParam,
    repeatEndDateParam,
    extraFieldsParam("Use it for any field this form does not cover."),
  ],
  output: [
    {
      key: "status",
      type: "array",
      label: "The created status, plus any prior overlapping status this call replaced",
    },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        status_type_id: input.statusTypeId,
        people_id: input.peopleId,
        start_date: input.startDate,
        end_date: input.endDate,
        status_name: input.statusName,
        repeat_state: input.repeat_state,
        repeat_end_date: input.repeat_end_date,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json("/status", { method: "POST", body });
  },
};

export default statusCreate;
