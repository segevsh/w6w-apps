import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  subscribers_data: unknown;
  update_subscriber?: boolean;
  complete_json?: boolean;
}

/** `POST /api/1/batchAddSubscribers/` */
const subscribersBatchAdd: ActionDefinition<Input> = {
  key: "subscribers-batch-add",
  type: "perform",
  title: "Batch Add Subscribers",
  description:
    "Add up to 1000 subscribers to a list in one call (limit: 5 requests per second). Returns one entry per subscriber: the new ID or its error.",
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
      key: "subscribers_data",
      label: "Subscribers",
      type: "json",
      required: true,
      hint: 'Array of objects of merge tag -> value, at most 1000, e.g. [{"email":"a@b.co"}].',
    },
    {
      key: "update_subscriber",
      label: "Update existing",
      type: "boolean",
      hint: "Modify the fields of subscribers already on the list.",
    },
    {
      key: "complete_json",
      label: "Complete JSON",
      type: "boolean",
      hint: 'Return {"email":..., "id":...} per subscriber.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "batchAddSubscribers", {
      list_id: required("list_id", input.list_id),
      subscribers_data: JSON.stringify(parseJsonField("subscribers_data", input.subscribers_data)),
      update_subscriber: input.update_subscriber,
      complete_json: input.complete_json,
    });
    return { result };
  },
};

export default subscribersBatchAdd;
