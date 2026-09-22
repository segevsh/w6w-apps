import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";

/**
 * `POST /api/contact-lists` — "Create a List".
 *
 * Answers `201` with `{id}` — the new list's hexadecimal ID, which is what a
 * campaign's `listIds` and the membership endpoints take.
 *
 * The name is the only field, and the document bounds it in prose rather than
 * in the schema: "A list name containing less than 42 characters". `ListDto`
 * declares no `maxLength`, so the 41-character ceiling is enforced here as a
 * form validation and quoted from the vendor's own sentence — a form should not
 * let a caller type a name the API will reject.
 *
 * Names are usable as an address almost everywhere else in this API
 * (`/contact-lists/{listIdOrName}`), but a name can be changed out from under a
 * workflow by someone in the dashboard. Use the returned ID when a workflow
 * needs a stable handle.
 */
interface Input {
  name: string;
}

const contactListCreate: ActionDefinition<Input> = {
  key: "contact-list-create",
  type: "perform",
  resource: "contact-list",
  title: "Create Contact List",
  description: "Create a contact list.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "My New List",
      validation: { maxLength: 41 },
      hint: 'The vendor\'s own limit: "A list name containing less than 42 characters".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating a SimpleTexting contact list");
    return new SimpleTextingClient(ctx).json("/api/contact-lists", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default contactListCreate;
