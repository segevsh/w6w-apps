import type { ActionDefinition } from "@w6w/types";
import { MailgunClient } from "../lib/client.ts";

/**
 * `POST /v3/lists/{list_address}/members` — add (or, with `upsert`, update)
 * one member of a mailing list.
 * Source: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/post-lists-string:list_address-members
 *
 * A mailing list is addressed by its own email (`list@mg.example.com`), which
 * already carries the domain — so this action takes `listAddress` instead of
 * the `domain` param used by the domain-scoped endpoints.
 */
const action: ActionDefinition = {
  key: "list-member-add",
  type: "perform",
  resource: "list-member",
  title: "Add a mailing list member",
  description: "Add (or upsert) a member of a mailing list.",
  idempotent: false,
  params: [
    {
      key: "listAddress",
      label: "Mailing List Address",
      type: "string",
      required: true,
      placeholder: "list@mg.example.com",
    },
    { key: "address", label: "Member Email", type: "string", required: true, default: "" },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "vars",
      label: "Variables",
      type: "json",
      default: {},
      hint: "Custom key/value data for this member.",
    },
    { key: "subscribed", label: "Subscribed", type: "boolean", default: true },
    {
      key: "upsert",
      label: "Upsert",
      type: "boolean",
      default: false,
      hint: "Update the member if the address already exists instead of failing.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listAddress = String(p.listAddress ?? "").trim();
    const address = String(p.address ?? "").trim();
    if (!listAddress) throw new Error("`listAddress` is required");
    if (!address) throw new Error("`address` is required");

    const varsRaw = p.vars;
    const vars = typeof varsRaw === "string"
      ? (varsRaw.trim() ? varsRaw : undefined)
      : (varsRaw && Object.keys(varsRaw as Record<string, unknown>).length
        ? JSON.stringify(varsRaw)
        : undefined);

    const client = new MailgunClient(ctx);
    return await client.postForm(`/v3/lists/${encodeURIComponent(listAddress)}/members`, {
      address,
      name: typeof p.name === "string" && p.name ? p.name : undefined,
      vars,
      subscribed: typeof p.subscribed === "boolean" ? (p.subscribed ? "yes" : "no") : undefined,
      upsert: p.upsert === true ? "yes" : "no",
    });
  },
};

export default action;
