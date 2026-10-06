import type { ActionDefinition } from "@w6w/types";
import { PardotClient, unset } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";
import {
  prospectBody,
  prospectFieldParams,
  type ProspectInput,
  WRITE_DEFAULT_FIELDS,
} from "../lib/prospect.ts";

const prospectCreate: ActionDefinition<ProspectInput> = {
  key: "prospect-create",
  type: "perform",
  resource: "prospect",
  title: "Create Prospect",
  description:
    "Create a prospect. Only the email is required. Use Upsert Prospect when the person may already exist.",
  // Pardot mints a new id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    ...prospectFieldParams,
    fieldsParam(WRITE_DEFAULT_FIELDS),
  ],
  output: [
    { key: "id", type: "number", label: "Prospect ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const body = prospectBody(input);
    if (!body.email) throw new Error("`email` is required to create a prospect.");
    const created = await new PardotClient(ctx).request<Record<string, unknown> | undefined>(
      "/prospects",
      {
        method: "POST",
        query: { fields: unset(input.fields) ?? WRITE_DEFAULT_FIELDS },
        body,
      },
    );
    // 204: created, but the API user may not view the prospect it just made.
    return created ?? { created: true };
  },
};

export default prospectCreate;
