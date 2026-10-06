import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";
import { type OrderOutput, sendOutput, SPEND_WARNING } from "../lib/send.ts";

/**
 * `POST /api/v2/orders/{orderId}/replay` — submit a copy of a settled order as a new order.
 * Refused (400) for a cancelled order, one that has not settled, or one with no mailed pieces.
 */
interface Input {
  orderId: string;
  recipients?: unknown;
  scheduleFor?: string;
  metadata?: unknown;
}

const orderReplay: ActionDefinition<Input> = {
  key: "order-replay",
  type: "perform",
  resource: "order",
  title: "Replay Order",
  description: SPEND_WARNING + "Submit a copy of a previously placed order as a brand-new order: " +
    "the same creative is charged and mailed again. The original is left untouched.",
  idempotent: false,
  params: [
    idParam("orderId", "Order ID", "The order to copy. It must have settled and not be cancelled."),
    {
      key: "recipients",
      label: "Recipients override",
      type: "json",
      hint: 'Optional array of {"name","address","city","province","postal_code",…}; `address` ' +
        "is required on each. Default: the recipients the original order mailed to.",
    },
    {
      key: "scheduleFor",
      label: "Send date",
      type: "string",
      hint: "Optional; the date part is stored.",
    },
    { key: "metadata", label: "Metadata", type: "json" },
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    const order = await new ThanksioClient(ctx).call(
      `/orders/${encodeId(input.orderId)}/replay`,
      {
        method: "POST",
        body: compact({
          recipients: asOptionalJson(input.recipients, "Recipients override"),
          schedule_for: input.scheduleFor,
          metadata: asOptionalJson(input.metadata, "Metadata"),
        }),
      },
    );
    const out: OrderOutput = {
      orderId: typeof order.id === "number" ? order.id : undefined,
      status: typeof order.status === "string" ? order.status : undefined,
      order,
    };
    return out;
  },
};

export default orderReplay;
