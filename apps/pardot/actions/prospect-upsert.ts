import type { ActionDefinition } from "@w6w/types";
import { PardotClient, unset } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";
import { prospectBody, prospectFieldParams, type ProspectInput } from "../lib/prospect.ts";

interface Input extends ProspectInput {
  matchEmail?: string;
}

const prospectUpsert: ActionDefinition<Input> = {
  key: "prospect-upsert",
  type: "perform",
  resource: "prospect",
  title: "Upsert Prospect by Email",
  description:
    "Update the prospect with this email (the one with the latest activity, if several), or create it. Set Match email to change a prospect's email address.",
  // Converges on the email: a retry updates the prospect the first call made.
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "matchEmail",
      label: "Match email",
      type: "string",
      hint: "Find the prospect by this address instead, then set its email to the one above.",
    },
    ...prospectFieldParams,
    fieldsParam("id,email"),
  ],
  output: [
    { key: "id", type: "number", label: "Prospect ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const prospect = prospectBody(input);
    if (!prospect.email) throw new Error("`email` is required to upsert a prospect.");
    const fields = (unset(input.fields) ?? "id,email").split(",").map((f) => f.trim()).filter(
      Boolean,
    );
    return new PardotClient(ctx).request("/prospects/do/upsertLatestByEmail", {
      method: "POST",
      body: { matchEmail: unset(input.matchEmail), prospect, fields },
    });
  },
};

export default prospectUpsert;
