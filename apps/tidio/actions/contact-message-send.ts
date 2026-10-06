import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str, text } from "../lib/params.ts";

/** `POST /contacts/{contactId}/messages` -> 202 `{status}`. */
type Input = { contact_id: string; message: string };

const contactMessageSend: ActionDefinition<Input> = {
  key: "contact-message-send",
  type: "perform",
  resource: "contact",
  title: "Send Message As Contact",
  description:
    "Ingest a message as if the contact had typed it (for partner-hosted widgets). Tidio processes it asynchronously.",
  idempotent: false,
  params: [
    str("contact_id", "Contact ID", { required: true }),
    text("message", "Message", {
      required: true,
      hint: "1 to 5000 characters.",
      validation: { minLength: 1, maxLength: 5000 },
    }),
  ],
  output: [{ key: "status", type: "string", label: "Processing status reported by Tidio" }],
  async execute(input, ctx) {
    if (
      typeof input.message !== "string" || input.message.length < 1 || input.message.length > 5000
    ) {
      throw new Error("message must be 1-5000 characters");
    }
    const body = await call(ctx, "POST", `/contacts/${encodeId(input.contact_id)}/messages`, {
      body: { message: input.message },
    });
    return { status: (body as { status?: string } | null)?.status ?? "accepted" };
  },
};

export default contactMessageSend;
