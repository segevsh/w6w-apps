import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, FloatClient } from "../lib/client.ts";
import { extraFieldsParam, idParam } from "../lib/params.ts";

/**
 * `PATCH /v3/status/{status_id}` — update a status.
 *
 * Like create, the response is `{"status": [...]}` rather than a bare
 * object — see `actions/status-create.ts` for why.
 */
interface Input {
  status_id: number;
  startDate?: string;
  endDate?: string;
  statusName?: string;
  extraFields?: unknown;
}

const statusUpdate: ActionDefinition<Input> = {
  key: "status-update",
  type: "perform",
  resource: "status",
  title: "Update Status",
  description: "Update a status's details. Only the fields provided are changed.",
  idempotent: true,
  params: [
    idParam("status_id", "Status ID"),
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "statusName", label: "Status name", type: "string" },
    extraFieldsParam("Use it for `people_id`, `status_type_id`, or repeat fields."),
  ],
  output: [
    { key: "status", type: "array", label: "The updated status, in a `{status: [...]}` wrapper" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        start_date: input.startDate,
        end_date: input.endDate,
        status_name: input.statusName,
      }),
      ...(extra ?? {}),
    };
    return await new FloatClient(ctx).json(`/status/${input.status_id}`, { method: "PATCH", body });
  },
};

export default statusUpdate;
