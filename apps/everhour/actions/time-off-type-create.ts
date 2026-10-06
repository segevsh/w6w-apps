import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient } from "../lib/client.ts";

/**
 * `POST /resource-planner/time-off-types` — Create a time-off type.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  name: string;
  color?: string;
  paid?: boolean;
  description?: string;
}

const timeOffTypeCreate: ActionDefinition<Input> = {
  key: "time-off-type-create",
  type: "perform",
  resource: "time-off-type",
  title: "Create Time-Off Type",
  description: "Create a time-off type.",
  idempotent: false,
  params: [
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
    return new EverhourClient(ctx).one(`/resource-planner/time-off-types`, {
      method: "POST",
      body: compact({
        name: input.name,
        color: input.color,
        paid: input.paid,
        description: input.description,
      }),
    });
  },
};

export default timeOffTypeCreate;
