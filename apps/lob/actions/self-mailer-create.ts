import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";
import { idempotencyKeyFor, mailBody, type MailInput } from "../lib/mail.ts";
import { mailOutput, sharedCreateParams } from "../lib/params.ts";

interface Input extends MailInput {
  inside: string;
  outside: string;
  size?: string;
}

const selfMailerCreate: ActionDefinition<Input> = {
  key: "self-mailer-create",
  type: "perform",
  resource: "self-mailer",
  title: "Create Self Mailer",
  description:
    "Create and mail a self-mailer (a folded piece addressed on its outside), or schedule it with a send date. On a live key this mails a real piece; on a test key nothing is mailed.",
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
      key: "inside",
      label: "Inside",
      type: "text",
      required: true,
      hint: "HTML, a public URL to a PDF/PNG/JPG, or a template id (tmpl_…).",
    },
    {
      key: "outside",
      label: "Outside",
      type: "text",
      required: true,
      hint: "HTML, a public URL, or a template id (tmpl_…). Lob prints the address panel.",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      default: "6x18_bifold",
      options: [
        { value: "6x18_bifold", label: "6x18 bifold" },
        { value: "11x9_bifold", label: "11x9 bifold" },
        { value: "12x9_bifold", label: "12x9 bifold" },
        { value: "17.75x9_trifold", label: "17.75x9 trifold" },
      ],
    },
    ...sharedCreateParams.slice(1),
  ],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json("/self_mailers", {
      method: "POST",
      idempotencyKey: idempotencyKeyFor(input, ctx),
      body: {
        ...mailBody(input),
        inside: input.inside,
        outside: input.outside,
        ...compact({ size: input.size }),
      },
    });
  },
};

export default selfMailerCreate;
