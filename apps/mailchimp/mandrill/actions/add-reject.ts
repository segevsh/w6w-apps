import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  email: string;
  comment?: string;
  subaccount?: string;
}

const addReject: ActionDefinition<Input> = {
  key: "add-reject",
  type: "perform",
  resource: "reject",
  title: "Add Reject",
  description: "Add an email to the rejection denylist (POST /rejects/add.json).",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "comment", label: "Comment", type: "string" },
    { key: "subaccount", label: "Subaccount", type: "string" },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "added", type: "boolean", label: "Added" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/rejects/add.json", {
      email: input.email,
      comment: input.comment,
      subaccount: input.subaccount,
    });
  },
};

export default addReject;
