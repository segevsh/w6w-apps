import type { ActionDefinition } from "@w6w/types";
import { compact, csv, FrontClient, json } from "../lib/client.ts";

/**
 * `PATCH /contacts/{contact_id}` — verified against Front's own OpenAPI
 * document (`update-contact`).
 *
 * **`custom_fields` replaces the whole set.** Front's own note: send only the
 * fields you want to change and "the other custom fields will be erased". So
 * the safe sequence is read (`contact-get`), merge, send everything — and the
 * param says so rather than leaving it to be discovered.
 *
 * Handles are **not** editable here. Front adds and removes them one at a time
 * on their own routes, which is the honest shape — a handle is an identity, and
 * replacing the array wholesale would silently orphan history. This action
 * therefore edits the profile, not who the person is.
 *
 * The contact may be addressed by a handle alias (`alt:email:…`) exactly as in
 * `contact-get`, so a workflow can update by address without a lookup first.
 */
const action: ActionDefinition = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update contact",
  description:
    "Change a contact's name, description, links, lists or custom fields. Handles are not " +
    "editable here — they are identities, added and removed individually.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID or Handle Alias",
      type: "string",
      required: true,
      default: "",
      placeholder: "alt:email:ada@example.com",
    },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "links",
      label: "Links",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated URLs. Replaces the existing list.",
    },
    {
      key: "listNames",
      label: "Contact Lists",
      type: "string",
      default: "",
      advanced: true,
      hint: "⚠️ Comma-separated names; Front creates any that do not exist.",
    },
    {
      key: "customFields",
      label: "Custom Fields",
      type: "json",
      default: "",
      advanced: true,
      hint: "⚠️ Replaces the WHOLE set — any field you omit is erased. Read the contact first " +
        "and send them all.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contactId = String(p.contactId ?? "");
    if (!contactId) throw new Error("`contactId` is required");

    const body = compact({
      name: p.name,
      description: p.description,
      links: csv(p.links),
      list_names: csv(p.listNames),
      custom_fields: json(p.customFields, "customFields"),
    });
    if (Object.keys(body).length === 0) throw new Error("nothing to update");

    ctx.log("info", "updating Front contact", { contactId, fields: Object.keys(body) });
    await new FrontClient(ctx).request(`/contacts/${encodeURIComponent(contactId)}`, {
      method: "PATCH",
      body,
    });
    // Front answers 204 with no body.
    return { ok: true };
  },
};

export default action;
