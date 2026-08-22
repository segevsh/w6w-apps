import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  contactIdentity,
  LoopsClient,
  mailingListSubscriptions,
  mergeCustomProperties,
} from "../lib/client.ts";
import { CONTACT_IDENTITY_PARAMS, CUSTOM_PROPERTIES_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/contacts/update` — verified against Loops' OpenAPI document
 * (`ContactUpdateRequest`; one of `email` or `userId` required).
 *
 * **This upserts.** Unlike `contact-create`, an unknown contact is created
 * rather than refused — which makes it the right action for a workflow that
 * runs on every signup or every sync and should not care whether the person is
 * already known.
 *
 * **Changing an email address needs a `userId`.** Loops' own note: *"If you
 * want to update a contact's email address, the contact will first need a
 * `userId` value."* Keyed by email, a new address is not a rename — it is a
 * different contact, and Loops creates one. That is the quiet failure this
 * action guards: asking to change the email while keyed only by email is
 * refused locally rather than silently forking the record.
 */
const action: ActionDefinition = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Create or update a contact",
  description: "Upsert a contact by email or user id.",
  idempotent: true,
  params: [
    ...CONTACT_IDENTITY_PARAMS,
    {
      key: "newEmail",
      label: "New Email Address",
      type: "string",
      default: "",
      hint: "Renames the contact. REQUIRES that you identify them by User ID — keyed by email, " +
        "a new address creates a second contact instead of renaming the first.",
    },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    { key: "userGroup", label: "User Group", type: "string", default: "" },
    { key: "source", label: "Source", type: "string", default: "" },
    {
      key: "subscribed",
      label: "Subscribed",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Subscribed" },
        { value: "false", label: "Unsubscribed" },
      ],
      hint: "Unsubscribing here stops campaign and workflow email for this contact.",
    },
    {
      key: "mailingLists",
      label: "Mailing Lists",
      type: "string",
      default: "",
      hint: "Comma-separated ids to subscribe to. For removals, pass a JSON object of " +
        "id → true/false.",
    },
    CUSTOM_PROPERTIES_PARAM,
  ],
  output: [
    { key: "success", type: "boolean", label: "Updated" },
    { key: "id", type: "string", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const identity = contactIdentity(p.email, p.userId, "`contact-update`");
    const newEmail = String(p.newEmail ?? "").trim();
    if (newEmail && !identity.userId) {
      throw new Error(
        "changing the email address needs a `userId` — identified by email alone, Loops creates " +
          "a second contact rather than renaming the first",
      );
    }

    const body: Record<string, unknown> = compact({
      ...identity,
      firstName: p.firstName,
      lastName: p.lastName,
      userGroup: p.userGroup,
      source: p.source,
      mailingLists: mailingListSubscriptions(p.mailingLists),
    });
    if (newEmail) body.email = newEmail;
    // "" means "leave unchanged", so only an explicit choice is sent.
    if (p.subscribed === "true" || p.subscribed === true) body.subscribed = true;
    if (p.subscribed === "false" || p.subscribed === false) body.subscribed = false;
    mergeCustomProperties(body, p.customProperties);

    ctx.log("info", "updating a Loops contact", { renaming: Boolean(newEmail) });

    return await new LoopsClient(ctx).request("/contacts/update", { method: "PUT", body });
  },
};

export default action;
