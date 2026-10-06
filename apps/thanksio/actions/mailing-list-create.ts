import type { ActionDefinition } from "@w6w/types";
import { compact, ThanksioClient } from "../lib/client.ts";

/** `POST /api/v2/mailing-lists/` — `description` is required; answers 201 with the new list. */
interface Input {
  description: string;
  subAccountId?: number;
  qrcodeUrl?: string;
}

const mailingListCreate: ActionDefinition<Input> = {
  key: "mailing-list-create",
  type: "perform",
  resource: "mailing-list",
  title: "Create Mailing List",
  description: "Create an empty mailing list. A QR code URL, if given, becomes the default QR " +
    "code for orders placed with this list.",
  idempotent: false,
  params: [
    { key: "description", label: "Name", type: "string", required: true },
    { key: "subAccountId", label: "Sub-account ID", type: "number" },
    { key: "qrcodeUrl", label: "QR code URL", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Mailing list ID" },
    { key: "mailingList", type: "object", label: "The new mailing list" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call("/mailing-lists/", {
      method: "POST",
      body: compact({
        description: input.description,
        sub_account_id: input.subAccountId,
        qrcode_url: input.qrcodeUrl,
      }),
    });
    return { id: body.id, mailingList: body };
  },
};

export default mailingListCreate;
