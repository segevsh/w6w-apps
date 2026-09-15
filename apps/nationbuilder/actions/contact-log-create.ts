import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  signupId: string;
  contactMethod?: string;
  contactStatus?: string;
  content?: string;
  pcInCents?: number;
}

/**
 * `POST /api/v2/contacts` — confirmed against the vendor's OpenAPI spec.
 *
 * NationBuilder's "contact" is **not** a person — it is a logged record of a
 * single contact *attempt* (a canvass call, a door knock, a text) against a
 * person's ("signup") record, carrying a method, a status and free-text
 * content. Conflating this with a CRM "contact" (a person record, called
 * `person`/`signup` in this app — see `person-get.ts`) would silently record
 * the wrong thing; it is broken out as its own action specifically so that
 * confusion cannot happen quietly.
 *
 * `contactMethod`/`contactStatus` enums are copied verbatim from the
 * OpenAPI spec's `contact_create_request` schema.
 */
const contactLogCreate: ActionDefinition<Input> = {
  key: "contact-log-create",
  type: "perform",
  resource: "contact-log",
  title: "Log a Contact Attempt",
  description:
    "Record a contact attempt (a call, door knock, text, etc.) against a person's record. " +
    'This is NationBuilder\'s "contact" resource, distinct from the person record itself.',
  idempotent: false,
  params: [
    { key: "signupId", label: "Person ID", type: "string", required: true },
    {
      key: "contactMethod",
      label: "Contact method",
      type: "select",
      options: [
        { value: "delivery", label: "Delivery" },
        { value: "door_knock", label: "Door knock" },
        { value: "email", label: "Email" },
        { value: "email_blast", label: "Email blast" },
        { value: "face_to_face", label: "Face to face" },
        { value: "facebook", label: "Facebook" },
        { value: "meeting", label: "Meeting" },
        { value: "phone_call", label: "Phone call" },
        { value: "robocall", label: "Robocall" },
        { value: "snail_mail", label: "Snail mail" },
        { value: "text", label: "Text" },
        { value: "text_1to1", label: "Text (1:1)" },
        { value: "text_blast", label: "Text blast" },
        { value: "tweet", label: "Tweet" },
        { value: "video_call", label: "Video call" },
        { value: "webinar", label: "Webinar" },
        { value: "linkedin", label: "LinkedIn" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "contactStatus",
      label: "Contact status",
      type: "select",
      options: [
        { value: "answered", label: "Answered" },
        { value: "bad_info", label: "Bad info" },
        { value: "left_message", label: "Left message" },
        { value: "meaningful_interaction", label: "Meaningful interaction" },
        { value: "send_information", label: "Send information" },
        { value: "not_interested", label: "Not interested" },
        { value: "no_answer", label: "No answer" },
        { value: "refused", label: "Refused" },
        { value: "inaccessible", label: "Inaccessible" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "content", label: "Notes", type: "text" },
    {
      key: "pcInCents",
      label: "Political capital awarded (cents)",
      type: "number",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact log ID" },
    { key: "signup_id", type: "string", label: "Person ID" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/contacts", {
      method: "POST",
      body: dataEnvelope("contacts", {
        signup_id: input.signupId,
        contact_method: input.contactMethod,
        contact_status: input.contactStatus,
        content: input.content,
        pc_in_cents: input.pcInCents,
      }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default contactLogCreate;
