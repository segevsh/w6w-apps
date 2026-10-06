import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  subscriber: string;
}

/** `POST /api/1/getSubscriberDetails/` */
const subscriberDetailsGet: ActionDefinition<Input> = {
  key: "subscriber-details-get",
  type: "read",
  title: "Get Subscriber Details",
  description: "Advanced data about one subscriber of one list (limit: 5 requests per second).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "subscriber",
      label: "Subscriber email",
      type: "string",
      required: true,
      hint: "Subscriber email address.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getSubscriberDetails", {
      list_id: required("list_id", input.list_id),
      subscriber: required("subscriber", input.subscriber),
    });
    return { result };
  },
};

export default subscriberDetailsGet;
