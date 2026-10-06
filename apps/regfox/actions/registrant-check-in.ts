import type { ActionDefinition } from "@w6w/types";
import { RegfoxClient } from "../lib/client.ts";
import { checkBody, checkParams } from "../lib/check.ts";

/** `POST /v2/public/registrant/check-in` — by `id` or by `displayId`. */
const registrantCheckIn: ActionDefinition<Record<string, unknown>> = {
  key: "registrant-check-in",
  type: "perform",
  resource: "registrant",
  title: "Check In Registrant",
  description: "Mark a registrant as checked in, by registrant id or by the display id on their " +
    "ticket. Give exactly one of the two.",
  idempotent: false,
  params: checkParams("check-in"),
  output: [
    { key: "id", type: "number", label: "Registrant id (when checked in by id)" },
    { key: "displayId", type: "string", label: "Display id (when checked in by display id)" },
    { key: "date", type: "string", label: "Check-in timestamp set" },
  ],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call<Record<string, unknown>>(
      "/registrant/check-in",
      { method: "POST", body: checkBody(input) },
    );
    return { ...(body.data ?? {}) };
  },
};

export default registrantCheckIn;
