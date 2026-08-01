import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `DELETE /v3/lists/{list_address}/members/{member_address}` — remove one
 * member from a mailing list.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/delete-lists-list_address-members-member_address
 */
const action: ActionDefinition = {
  key: "list-member-delete",
  type: "perform",
  resource: "list-member",
  title: "Remove a mailing list member",
  description: "Remove a member from a mailing list.",
  idempotent: true,
  params: [
    {
      key: "listAddress",
      label: "Mailing List Address",
      type: "string",
      required: true,
      placeholder: "list@mg.example.com",
    },
    { key: "address", label: "Member Email", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listAddress = String(p.listAddress ?? "").trim();
    const address = String(p.address ?? "").trim();
    if (!listAddress) throw new Error("`listAddress` is required");
    if (!address) throw new Error("`address` is required");

    const client = new MailgunClient(ctx);
    return await client.request(
      `/v3/lists/${encodeURIComponent(listAddress)}/members/${encodeURIComponent(address)}`,
      { method: "DELETE" },
    );
  },
};

export default action;
