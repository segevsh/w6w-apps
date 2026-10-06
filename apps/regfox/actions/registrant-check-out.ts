import type { ActionDefinition } from "@w6w/types";
import { RegfoxClient } from "../lib/client.ts";
import { checkBody, checkParams } from "../lib/check.ts";

/** `POST /v2/public/registrant/check-out` — by `id` or by `displayId`. */
const registrantCheckOut: ActionDefinition<Record<string, unknown>> = {
  key: "registrant-check-out",
  type: "perform",
  resource: "registrant",
  title: "Check Out Registrant",
  description: "Mark a registrant as checked out, by registrant id or by the display id on their " +
    "ticket. Give exactly one of the two.",
  idempotent: false,
  params: checkParams("check-out"),
  output: [
    { key: "id", type: "number", label: "Registrant id (when checked out by id)" },
    { key: "displayId", type: "string", label: "Display id (when checked out by display id)" },
    { key: "date", type: "string", label: "Check-out timestamp set" },
  ],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call<Record<string, unknown>>(
      "/registrant/check-out",
      { method: "POST", body: checkBody(input) },
    );
    return { ...(body.data ?? {}) };
  },
};

export default registrantCheckOut;
