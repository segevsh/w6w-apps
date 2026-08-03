import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import type { MailjetContactList } from "./list-contact-lists.ts";

interface Input {
  name: string;
}

/**
 * Create a contact list.
 *
 * `Name` is required and **must be unique** on this API key — Mailjet's reference
 * says so directly ("User-specified name for this contact list (must be
 * unique)"). Combined with soft-deletion, that produces a trap worth stating: a
 * list you deleted still holds its name, so re-creating it with the same name
 * fails until the old one is purged. `list-contact-lists` with `isDeleted: true`
 * finds the culprit.
 */
const createContactList: ActionDefinition<Input> = {
  key: "create-contact-list",
  type: "perform",
  /** List names must be unique, so a retry errors rather than repeating. */
  idempotent: false,
  resource: "contactslist",
  title: "Create Contact List",
  description: "Create a contact list (POST /v3/REST/contactslist). Names must be unique — and a " +
    "soft-deleted list still holds its name.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Must be unique across this API key, including soft-deleted lists.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Contact list" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetContactList>>("/contactslist", {
      method: "POST",
      body: { Name: input.name },
    });
  },
};

export default createContactList;
