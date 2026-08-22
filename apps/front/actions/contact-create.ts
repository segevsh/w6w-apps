import type { ActionDefinition } from "@w6w/types";
import { compact, csv, FrontClient, json } from "../lib/client.ts";

/**
 * `POST /contacts` — verified against Front's own OpenAPI document
 * (`create-contact`).
 *
 * **Handles are the required part, and they are how Front recognises somebody.**
 * A contact with a name and no handle is unreachable and un-matchable: the next
 * email from that person creates a second, separate contact. Each handle is
 * `{handle, source}` where source is one of `email`, `phone`, `twitter`,
 * `facebook`, `intercom`, `front_chat` or `custom`.
 *
 * The common case — one email address — is a single field here; anything richer
 * uses the JSON param, which takes Front's own array shape.
 *
 * **`list_names` creates the lists it names.** Front's note is explicit: a list
 * that does not exist is created rather than rejected, so a typo silently
 * produces a new contact list. (Its predecessor `group_names` is deprecated and
 * is not offered.)
 */
const action: ActionDefinition = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create contact",
  description:
    "Create a contact. At least one handle is required — without one, Front cannot match the " +
    "next message to this person and will make a second contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      placeholder: "ada@example.com",
      hint: "The common case. For a phone number or a social handle, use Handles below.",
    },
    {
      key: "handles",
      label: "Handles",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Front\'s own shape: `[{"handle":"+15551234","source":"phone"}]`. Sources: email, ' +
        "phone, twitter, facebook, intercom, front_chat, custom. Merged with Email above.",
    },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "links",
      label: "Links",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated URLs.",
    },
    {
      key: "listNames",
      label: "Contact Lists",
      type: "string",
      default: "",
      advanced: true,
      hint: "⚠️ Comma-separated names. Front CREATES any list that does not exist, so a typo " +
        "makes a new list rather than an error.",
    },
    { key: "customFields", label: "Custom Fields", type: "json", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "handles", type: "array", label: "Handles" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    const extra = json(p.handles, "handles");
    const handles: Array<{ handle: string; source: string }> = [];
    if (email) handles.push({ handle: email, source: "email" });
    if (Array.isArray(extra)) handles.push(...extra as Array<{ handle: string; source: string }>);
    if (handles.length === 0) {
      throw new Error(
        "at least one handle is required — give `email`, or `handles` as " +
          '`[{"handle":"…","source":"…"}]`',
      );
    }

    ctx.log("info", "creating Front contact", { handles: handles.length });
    return await new FrontClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        handles,
        ...compact({
          name: p.name,
          description: p.description,
          links: csv(p.links),
          list_names: csv(p.listNames),
          custom_fields: json(p.customFields, "customFields"),
        }),
      },
    });
  },
};

export default action;
