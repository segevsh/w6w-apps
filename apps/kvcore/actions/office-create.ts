import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { entityBody, entityFields } from "../lib/params.ts";

/** `POST /v2/public/office` — create a new office. Requires an All-scoped token. */
const officeCreate: ActionDefinition<Record<string, unknown>> = {
  key: "office-create",
  type: "perform",
  resource: "office",
  title: "Create Office",
  description: "Create a new office on the account.",
  idempotent: false,
  params: entityFields("office", { create: true }),
  output: [
    { key: "id", type: "number", label: "Office ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json("/office", { method: "POST", body: entityBody(input) });
  },
};

export default officeCreate;
