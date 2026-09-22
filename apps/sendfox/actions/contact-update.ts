import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SendfoxClient, toIdList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PATCH /contacts/{id}` — update a contact.
 *
 * ## `lists` REPLACES, it does not add
 *
 * The document is explicit: `lists` is "Array of list IDs (replaces all current
 * list memberships)". So this action is not a way to add one membership — it is
 * a way to *set* the whole set, and anything not listed is removed. To add a
 * single list without disturbing the others, use `list-contacts-add`; to remove
 * one, its counterpart exists as an endpoint too but is not in this app's
 * covered surface — see the README.
 *
 * An empty `lists` array is honoured rather than dropped: it means "remove this
 * contact from every list", which is a legitimate thing to want and would be
 * impossible to express if emptiness were treated as "unset".
 *
 * ## `contact_fields` is upsert-style
 *
 * Each `{name, value}` names a custom field by its machine slug. The document
 * types `value` as nullable, so an explicit null clears a field, but this app
 * sends the string the user typed and leaves clearing to the UI's own empty
 * handling.
 *
 * Idempotent: applying the same patch twice lands on the same contact state.
 */
interface Input {
  id: number;
  firstName?: string;
  lastName?: string;
  lists?: number[];
  contactFields?: Array<{ name?: string; value?: string }>;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's names, list memberships and custom fields.",
  idempotent: true,
  params: [
    idParam("id", "Contact", "Contact id to update."),
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "lists",
      label: "Lists",
      type: "array",
      item: { type: "number", placeholder: "42" },
      hint: "REPLACES all current list memberships — anything not listed here is removed. Set an " +
        "empty list to remove the contact from every list. Use List: Add Contact to add one " +
        "membership without disturbing the others.",
    },
    {
      key: "contactFields",
      label: "Custom fields",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Field name", type: "string", placeholder: "company" },
          { key: "value", label: "Value", type: "string" },
        ],
      },
      hint: "Pairs of a custom field's machine name and its new value for this contact.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    const lists = input.lists === undefined ? undefined : (toIdList(input.lists) ?? []);
    return new SendfoxClient(ctx).json(`/contacts/${encodeId(input.id)}`, {
      method: "PATCH",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        lists,
        contact_fields: input.contactFields,
      }),
    });
  },
};

export default contactUpdate;
