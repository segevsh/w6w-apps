import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";
import { idempotencyKeyFor, mailBody, type MailInput } from "../lib/mail.ts";
import { mailOutput, sharedCreateParams } from "../lib/params.ts";

interface Input extends MailInput {
  file: string;
  color?: boolean;
  doubleSided?: boolean;
  addressPlacement?: string;
  extraService?: string;
  returnEnvelope?: boolean;
  size?: string;
}

const letterCreate: ActionDefinition<Input> = {
  key: "letter-create",
  type: "perform",
  resource: "letter",
  title: "Create Letter",
  description:
    "Create and mail a letter (or schedule it with a send date). On a live key this prints, bills and mails a real letter; on a test key nothing is mailed.",
  idempotent: false,
  params: [
    ...sharedCreateParams.slice(0, 1),
    {
      key: "from",
      label: "From",
      type: "json",
      required: true,
      hint: "Sender: a saved address id or an inline US address object.",
    },
    {
      key: "file",
      label: "File",
      type: "text",
      required: true,
      hint: "HTML, a public URL to a PDF, or a template id (tmpl_…).",
    },
    {
      key: "color",
      label: "Print in color",
      type: "boolean",
      required: true,
      default: false,
      hint: "Color costs more than black and white.",
    },
    { key: "doubleSided", label: "Double sided", type: "boolean", default: true },
    {
      key: "addressPlacement",
      label: "Address placement",
      type: "select",
      advanced: true,
      options: [
        { value: "top_first_page", label: "Top of first page" },
        { value: "insert_blank_page", label: "Insert blank page" },
        { value: "bottom_first_page_center", label: "Bottom of first page, centered" },
        { value: "bottom_first_page", label: "Bottom of first page" },
      ],
    },
    {
      key: "extraService",
      label: "Extra service",
      type: "select",
      advanced: true,
      options: [{ value: "certified", label: "Certified" }, {
        value: "certified_return_receipt",
        label: "Certified with return receipt",
      }, { value: "registered", label: "Registered" }],
    },
    { key: "returnEnvelope", label: "Include return envelope", type: "boolean", advanced: true },
    {
      key: "size",
      label: "Paper size",
      type: "select",
      advanced: true,
      options: [{ value: "us_letter", label: "US Letter" }, {
        value: "us_legal",
        label: "US Legal",
      }],
    },
    ...sharedCreateParams.slice(1),
  ],
  output: mailOutput,

  execute(input, ctx) {
    if (input.from === undefined || input.from === null || input.from === "") {
      throw new Error("From is required: Lob needs a return address on every letter");
    }
    return new LobClient(ctx).json("/letters", {
      method: "POST",
      idempotencyKey: idempotencyKeyFor(input, ctx),
      body: {
        ...mailBody(input),
        file: input.file,
        color: input.color ?? false,
        ...compact({
          double_sided: input.doubleSided,
          address_placement: input.addressPlacement,
          extra_service: input.extraService,
          return_envelope: input.returnEnvelope,
          size: input.size,
        }),
      },
    });
  },
};

export default letterCreate;
