import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LobClient } from "../lib/client.ts";
import { idempotencyKeyFor, mailBody, type MailInput } from "../lib/mail.ts";
import { mailOutput, sharedCreateParams } from "../lib/params.ts";

interface Input extends MailInput {
  front: string;
  back: string;
  size?: string;
  qrCode?: unknown;
}

const postcardCreate: ActionDefinition<Input> = {
  key: "postcard-create",
  type: "perform",
  resource: "postcard",
  title: "Create Postcard",
  description:
    "Create and mail a postcard (or schedule it with a send date). On a live key this prints, bills and mails a real postcard; on a test key nothing is mailed.",
  idempotent: false,
  params: [
    ...sharedCreateParams.slice(0, 1),
    {
      key: "from",
      label: "From",
      type: "json",
      advanced: true,
      hint:
        "Sender: a saved address id or an inline US address object. Optional for this mailpiece.",
    },
    {
      key: "front",
      label: "Front",
      type: "text",
      required: true,
      hint: "HTML, a public URL to a PDF/PNG/JPG, or a template id (tmpl_…).",
    },
    {
      key: "back",
      label: "Back",
      type: "text",
      required: true,
      hint:
        "HTML, a public URL, or a template id (tmpl_…). Lob prints the address block on the back.",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      default: "4x6",
      options: [{ value: "4x6", label: "4x6" }, { value: "6x9", label: "6x9" }, {
        value: "6x11",
        label: "6x11",
      }],
    },
    {
      key: "qrCode",
      label: "QR code",
      type: "json",
      advanced: true,
      hint: "Lob qr_code object: position, redirect_url, width, plus top/left/right/bottom.",
    },
    ...sharedCreateParams.slice(1),
  ],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json("/postcards", {
      method: "POST",
      idempotencyKey: idempotencyKeyFor(input, ctx),
      body: {
        ...mailBody(input),
        front: input.front,
        back: input.back,
        ...compact({ size: input.size, qr_code: asOptionalJson(input.qrCode, "QR code") }),
      },
    });
  },
};

export default postcardCreate;
