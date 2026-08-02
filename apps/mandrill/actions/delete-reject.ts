import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email: string;
  subaccount?: string;
}

const deleteReject: ActionDefinition<Input> = {
  key: "delete-reject",
  type: "perform",
  resource: "reject",
  title: "Delete Reject",
  description: "Remove an email from the rejection denylist (POST /rejects/delete.json).",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "subaccount", label: "Subaccount", type: "string" },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/rejects/delete.json", {
      email: input.email,
      subaccount: input.subaccount,
    });
  },
};

export default deleteReject;
