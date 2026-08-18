import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";

/**
 * `GET /contacts/{contact_id}` — verified against Front's own OpenAPI document
 * (`get-contact`).
 *
 * **This route is also the lookup-by-address route.** Front accepts a *resource
 * alias* in place of the id — `alt:email:ada@example.com`, `alt:phone:+15551234`,
 * `alt:twitter:ada` — which matters because the contact list has no email
 * filter. A workflow that knows an address and needs Front's contact for it
 * asks here, and gets a 404 if nobody owns that handle.
 *
 * The alias is passed through with its colons intact: `encodeURIComponent`
 * escapes them into `%3A`, which Front resolves the same way, so an address
 * containing a `/` or a `+` cannot break the path.
 */
const action: ActionDefinition = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get contact",
  description:
    "One contact by id — or by handle, using an `alt:email:…` / `alt:phone:…` alias, which is " +
    "the only way to look a person up by address.",
  params: [
    {
      key: "contactId",
      label: "Contact ID or Handle Alias",
      type: "string",
      required: true,
      default: "",
      placeholder: "alt:email:ada@example.com",
      hint: "A `cnt_…` id, or `alt:email:`, `alt:phone:`, `alt:twitter:` followed by the handle.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "handles", type: "array", label: "Handles" },
    { key: "links", type: "array", label: "Links" },
    { key: "custom_fields", type: "object", label: "Custom Fields" },
  ],

  async execute(input, ctx) {
    const { contactId } = input as { contactId: string };
    if (!contactId) throw new Error("`contactId` is required");
    return await new FrontClient(ctx).request(`/contacts/${encodeURIComponent(contactId)}`);
  },
};

export default action;
