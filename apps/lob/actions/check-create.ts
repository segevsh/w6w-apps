import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";
import { idempotencyKeyFor, mailBody, type MailInput } from "../lib/mail.ts";
import { mailOutput, sharedCreateParams } from "../lib/params.ts";

interface Input extends MailInput {
  bankAccount: string;
  amount: number;
  memo?: string;
  checkNumber?: number;
  message?: string;
  checkBottom?: string;
  attachment?: string;
  logo?: string;
}

const checkCreate: ActionDefinition<Input> = {
  key: "check-create",
  type: "perform",
  resource: "check",
  title: "Create Check",
  description:
    "Create and mail a check drawn on a verified bank account (or schedule it with a send date). On a live key this issues a real check; on a test key nothing is mailed.",
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
      key: "bankAccount",
      label: "Bank account",
      type: "string",
      required: true,
      placeholder: "bank_…",
      hint: "Id of a VERIFIED bank account. Lob refuses a check from an unverified one.",
    },
    {
      key: "amount",
      label: "Amount (USD)",
      type: "number",
      required: true,
      validation: { min: 0.01 },
    },
    { key: "memo", label: "Memo", type: "string", advanced: true },
    { key: "checkNumber", label: "Check number", type: "number", advanced: true },
    {
      key: "message",
      label: "Message",
      type: "text",
      advanced: true,
      hint: "Printed on the check page. Supply this OR a check bottom.",
    },
    {
      key: "checkBottom",
      label: "Check bottom",
      type: "text",
      advanced: true,
      hint: "HTML, a public URL or a template id for the lower portion, instead of a message.",
    },
    {
      key: "attachment",
      label: "Attachment",
      type: "text",
      advanced: true,
      hint: "HTML, URL or template id for a page attached behind the check.",
    },
    {
      key: "logo",
      label: "Logo",
      type: "string",
      advanced: true,
      hint: "Public URL of a PNG/JPG logo.",
    },
    ...sharedCreateParams.slice(1).filter((p) => p.key !== "mailType"),
  ],
  output: mailOutput,

  execute(input, ctx) {
    if (input.from === undefined || input.from === null || input.from === "") {
      throw new Error("From is required: Lob needs a return address on every check");
    }
    if (!input.message && !input.checkBottom) {
      throw new Error("Provide either a message or a check bottom — Lob requires one of them");
    }
    if (!(Number(input.amount) > 0)) throw new Error("Amount must be greater than zero");
    return new LobClient(ctx).json("/checks", {
      method: "POST",
      idempotencyKey: idempotencyKeyFor(input, ctx),
      body: {
        ...mailBody({ ...input, mailType: undefined }),
        bank_account: input.bankAccount,
        amount: Number(input.amount),
        ...compact({
          memo: input.memo,
          check_number: input.checkNumber,
          message: input.message,
          check_bottom: input.checkBottom,
          attachment: input.attachment,
          logo: input.logo,
        }),
      },
    });
  },
};

export default checkCreate;
