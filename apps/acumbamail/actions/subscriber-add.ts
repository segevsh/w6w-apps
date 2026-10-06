import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  merge_fields: unknown;
  double_optin?: boolean;
  update_subscriber?: boolean;
  complete_json?: boolean;
}

/** `POST /api/1/addSubscriber/` */
const subscriberAdd: ActionDefinition<Input> = {
  key: "subscriber-add",
  type: "perform",
  title: "Add Subscriber",
  description:
    "Add (or, with Update existing, modify) a subscriber on a list. Returns the subscriber ID, or {email, id} with Complete JSON.",
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
      key: "merge_fields",
      label: "Merge fields",
      type: "json",
      required: true,
      hint:
        'Object of merge tag -> value, e.g. {"email": "a@b.co", "name": "Ann"}. The list\'s email tag is required.',
    },
    {
      key: "double_optin",
      label: "Double opt-in",
      type: "boolean",
      hint: "Send a confirmation email when adding (default off).",
    },
    {
      key: "update_subscriber",
      label: "Update existing",
      type: "boolean",
      hint: "Modify the fields when the subscriber is already on the list (default off).",
    },
    {
      key: "complete_json",
      label: "Complete JSON",
      type: "boolean",
      hint: 'Return {"email":..., "id":...} instead of the bare ID.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "addSubscriber", {
      list_id: required("list_id", input.list_id),
      merge_fields: parseJsonField("merge_fields", input.merge_fields),
      double_optin: input.double_optin,
      update_subscriber: input.update_subscriber,
      complete_json: input.complete_json,
    });
    return { result };
  },
};

export default subscriberAdd;
