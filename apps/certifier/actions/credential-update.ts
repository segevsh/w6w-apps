import type { ActionDefinition } from "@w6w/types";
import { asObject, CertifierClient, compact, encodeId } from "../lib/client.ts";
import { dateOrThrow } from "../lib/body.ts";
import {
  credentialIdParam,
  customAttributesParam,
  expiryDateParam,
  issueDateParam,
} from "../lib/params.ts";

interface Input {
  credentialId: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  issueDate?: string;
  expiryDate?: string;
  clearExpiryDate?: boolean;
  customAttributes?: unknown;
}

const credentialUpdate: ActionDefinition<Input> = {
  key: "credential-update",
  type: "perform",
  resource: "credential",
  title: "Update Credential",
  description:
    "Change a credential's recipient, dates or custom attributes. Only the fields you set change.",
  idempotent: true,
  params: [
    credentialIdParam,
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "string",
      hint: "The credential's `recipient.id`. Required, with a name, to change the recipient.",
    },
    { key: "recipientName", label: "Recipient name", type: "string" },
    { key: "recipientEmail", label: "Recipient email", type: "string" },
    issueDateParam,
    expiryDateParam,
    {
      key: "clearExpiryDate",
      label: "Remove expiry date",
      type: "boolean",
      hint: "Sends a null expiry date so the credential never expires. Overrides Expiry date.",
    },
    customAttributesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "object", label: "Recipient" },
  ],

  execute(input, ctx) {
    const recipient = input.recipientId || input.recipientName || input.recipientEmail
      ? compact({
        id: input.recipientId?.trim(),
        name: input.recipientName,
        email: input.recipientEmail?.trim(),
      })
      : undefined;
    if (recipient && (!recipient.id || !recipient.name)) {
      throw new Error("changing the recipient needs both recipientId and recipientName");
    }
    const body = compact({
      recipient,
      issueDate: dateOrThrow(input.issueDate, "issueDate"),
      customAttributes: asObject(input.customAttributes, "customAttributes"),
    });
    if (input.clearExpiryDate === true) body.expiryDate = null;
    else {
      const expiry = dateOrThrow(input.expiryDate, "expiryDate");
      if (expiry) body.expiryDate = expiry;
    }
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update: set at least one field");
    }
    return new CertifierClient(ctx).json(`/credentials/${encodeId(input.credentialId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default credentialUpdate;
