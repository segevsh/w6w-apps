import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /resource-planner/time-off-types/{typeId}` — Update a time-off type.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  typeId: number;
  name: string;
  color?: string;
  paid?: boolean;
  description?: string;
}

const timeOffTypeUpdate: ActionDefinition<Input> = {
  key: "time-off-type-update",
  type: "perform",
  resource: "time-off-type",
  title: "Update Time-Off Type",
  description: "Update a time-off type.",
  idempotent: true,
  params: [
    {
      key: "typeId",
      label: "Time-off type ID",
      type: "number",
      required: true,
      hint: "Numeric time-off type id.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "color", label: "Color", type: "string", hint: "Hex colour, e.g. `#4babe5`." },
    { key: "paid", label: "Paid", type: "boolean" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "Type ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/resource-planner/time-off-types/${encodeId(input.typeId)}`,
      {
        method: "PUT",
        body: compact({
          name: input.name,
          color: input.color,
          paid: input.paid,
          description: input.description,
        }),
      },
    );
  },
};

export default timeOffTypeUpdate;
