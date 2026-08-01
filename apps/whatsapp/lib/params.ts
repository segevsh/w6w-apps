import type { OutputField, Param } from "@w6w/types";

/**
 * Param fragments reused across the send-* actions. Every `messages` call
 * needs a recipient, so it is declared once here.
 */

export const to: Param = {
  key: "to",
  label: "Recipient phone number",
  type: "string",
  required: true,
  hint: "Full phone number in international format, e.g. 15551234567 or +15551234567.",
};

export const caption: Param = {
  key: "caption",
  label: "Caption",
  type: "text",
  config: { multiline: true },
  hint: "Optional caption shown under the media.",
};

/** The envelope every `messages` call returns. */
export const messageOutput: OutputField[] = [
  { key: "messaging_product", type: "string", label: "Messaging product" },
  { key: "contacts", type: "array", label: "Contacts (input, wa_id)" },
  { key: "messages", type: "array", label: "Messages (id, message_status)" },
];
