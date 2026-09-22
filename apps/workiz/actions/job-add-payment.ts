import type { ActionDefinition } from "@w6w/types";
import { encodeId, WorkizClient } from "../lib/client.ts";
import { authSecretParam } from "../lib/params.ts";
import type { PaymentAck } from "../lib/schema.ts";

/**
 * `POST /job/addPayment/{UUID}/` — record a payment against a job.
 *
 * The one call in this API where a value is required **twice**: Workiz declares
 * the payment `type` as a required query parameter (`?type=cash|credit|check`)
 * *and* a required body field, and both are supplied from the same `type` input
 * here.
 *
 * The body's required set is `{auth_secret, amount, type, date}` — the only body
 * in this app where Workiz marks anything beyond the record secret required —
 * with `reference` optional. `date` is a date-time, not a date.
 *
 * The response is `{flag, msg, data: {paymentId}}`. Not idempotent: each call
 * records a new payment, so a retry books the money twice.
 */
interface Input {
  uuid: string;
  type: "cash" | "credit" | "check";
  amount: number;
  date: string;
  authSecret: string;
  reference?: string;
}

const jobAddPayment: ActionDefinition<Input, PaymentAck> = {
  key: "job-add-payment",
  type: "perform",
  resource: "job",
  title: "Add Job Payment",
  description: "Record a cash, credit or cheque payment against a job.",
  idempotent: false,
  params: [
    {
      key: "uuid",
      label: "Job UUID",
      type: "string",
      required: true,
      hint: "The job's unique id.",
    },
    {
      key: "type",
      label: "Payment type",
      type: "select",
      required: true,
      options: [
        { value: "cash", label: "Cash" },
        { value: "credit", label: "Credit" },
        { value: "check", label: "Cheque" },
      ],
      hint: "Workiz requires this both as the type query parameter and in the body, so it is " +
        "sent as both.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
      hint: "The payment amount.",
    },
    {
      key: "date",
      label: "Date",
      type: "datetime",
      required: true,
      hint: "When the payment was taken, as a date-time.",
    },
    authSecretParam(),
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "A reference number for the payment — a cheque number, a processor id.",
    },
  ],
  output: [
    { key: "flag", type: "boolean", label: "Workiz accepted the payment" },
    { key: "msg", type: "string", label: "Vendor message" },
    { key: "data", type: "object", label: "Payment, with its paymentId" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<PaymentAck>(`/job/addPayment/${encodeId(input.uuid)}/`, {
      method: "POST",
      query: { type: input.type },
      body: {
        auth_secret: input.authSecret,
        amount: input.amount,
        type: input.type,
        date: input.date,
        reference: input.reference,
      },
    });
  },
};

export default jobAddPayment;
