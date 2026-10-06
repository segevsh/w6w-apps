import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  callback_url: string;
  subscribes?: boolean;
  unsubscribes?: boolean;
  hard_bounce?: boolean;
  soft_bounce?: boolean;
  complain?: boolean;
  opens?: boolean;
  click?: boolean;
  active?: boolean;
}

/** `POST /api/1/configListWebhook/` */
const listWebhookConfigure: ActionDefinition<Input> = {
  key: "list-webhook-configure",
  type: "perform",
  title: "Configure List Webhook",
  description:
    "Set a list's event webhook (limit: 10 requests per minute). Returns the webhook ID.",
  idempotent: true,
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "callback_url",
      label: "Callback URL",
      type: "string",
      required: true,
    },
    {
      key: "subscribes",
      label: "Subscribes",
      type: "boolean",
    },
    {
      key: "unsubscribes",
      label: "Unsubscribes",
      type: "boolean",
    },
    {
      key: "hard_bounce",
      label: "Hard bounces",
      type: "boolean",
    },
    {
      key: "soft_bounce",
      label: "Soft bounces",
      type: "boolean",
    },
    {
      key: "complain",
      label: "Complaints",
      type: "boolean",
    },
    {
      key: "opens",
      label: "Opens",
      type: "boolean",
    },
    {
      key: "click",
      label: "Clicks",
      type: "boolean",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
    },
  ],
  output: [{ key: "id", type: "string", label: "Identifier returned by the vendor" }],

  async execute(input, ctx) {
    const result = await call(ctx, "configListWebhook", {
      list_id: required("list_id", input.list_id),
      callback_url: required("callback_url", input.callback_url),
      subscribes: input.subscribes,
      unsubscribes: input.unsubscribes,
      hard_bounce: input.hard_bounce,
      soft_bounce: input.soft_bounce,
      complain: input.complain,
      opens: input.opens,
      click: input.click,
      active: input.active,
    });
    return { id: result === null || result === undefined ? null : String(result) };
  },
};

export default listWebhookConfigure;
