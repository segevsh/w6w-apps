import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty } from "../lib/client.ts";

interface Input {
  contactId: string;
  reactionText?: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact. Deletes the contact.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Contact id (BSON ObjectId hex).",
    },
    {
      key: "reactionText",
      label: "Reason",
      type: "string",
      hint:
        "Recorded as a dislike on the contact when it came from an AI lead suggestion; ignored otherwise.",
    },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "Whether the call succeeded (the API answers 204 No Content)",
    },
  ],

  async execute(input, ctx) {
    const body = compact({
      reaction_text: input.reactionText,
    });
    const result = await new HoneyBookClient(ctx).request(
      "DELETE",
      `/contacts/${encodeId(input.contactId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result ?? { success: true };
  },
};

export default contactDelete;
