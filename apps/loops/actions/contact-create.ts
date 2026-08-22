import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  LoopsClient,
  mailingListSubscriptions,
  mergeCustomProperties,
} from "../lib/client.ts";
import { CUSTOM_PROPERTIES_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/contacts/create` — verified against Loops' OpenAPI document
 * (`ContactRequest` = `ContactFields` with `email` required).
 *
 * **Create fails on an existing contact; update upserts.** The spec models a
 * `409` here, and that is the intended behaviour — this action is for "this
 * person is new". A workflow that runs on every signup and does not care
 * whether the person is already known wants `contact-update`, which creates or
 * updates in one call. Reaching for create there turns a normal re-run into a
 * failed step.
 *
 * **Custom properties must already exist in Loops.** They live at the top level
 * of the contact object beside `firstName`, and Loops rejects a write naming
 * one the workspace has not defined — `contact-property-create` is how you add
 * it first.
 */
const action: ActionDefinition = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create a contact",
  description: "Add a new contact. Fails if the email is already known — use Update to upsert.",
  // Loops answers 409 for a duplicate rather than merging.
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com",
    },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      default: "",
      hint: "Your own id for this person. Set it now — changing an email later REQUIRES one.",
    },
    { key: "userGroup", label: "User Group", type: "string", default: "" },
    {
      key: "source",
      label: "Source",
      type: "string",
      default: "",
      hint: "Replaces the default source of “API”.",
    },
    {
      key: "subscribed",
      label: "Subscribed",
      type: "boolean",
      default: true,
      hint: "Off creates the contact already opted out of campaign and workflow email.",
    },
    {
      key: "mailingLists",
      label: "Mailing Lists",
      type: "string",
      default: "",
      hint: "Comma-separated ids to subscribe to.",
    },
    CUSTOM_PROPERTIES_PARAM,
  ],
  output: [
    { key: "success", type: "boolean", label: "Created" },
    { key: "id", type: "string", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const body = compact({
      email,
      firstName: p.firstName,
      lastName: p.lastName,
      userId: p.userId,
      userGroup: p.userGroup,
      source: p.source,
      mailingLists: mailingListSubscriptions(p.mailingLists),
    });
    // `subscribed: false` is meaningful and must survive `compact`.
    if (p.subscribed !== undefined) body.subscribed = p.subscribed === true;
    mergeCustomProperties(body, p.customProperties);

    ctx.log("info", "creating a Loops contact", { fields: Object.keys(body).length });

    return await new LoopsClient(ctx).request("/contacts/create", { method: "POST", body });
  },
};

export default action;
