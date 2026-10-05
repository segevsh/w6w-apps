import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `POST /v1/subscriptions/{subscriptionId}/scheduleCancel` */
interface Input {
  subscriptionId: number;
  cancelWhen: string;
  scheduleDate?: string;
}

const subscriptionScheduleCancel: ActionDefinition<Input> = {
  key: "subscription-schedule-cancel",
  type: "perform",
  resource: "subscription",
  title: "Schedule Subscription Cancelation",
  description:
    "Schedule a subscription to cancel at the end of the billing period, or on a custom date. Scheduling twice fails with a 409.",
  idempotent: true,
  params: [
    {
      "key": "subscriptionId",
      "label": "Subscription ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
    {
      "key": "cancelWhen",
      "label": "Cancel when",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "end",
          "label": "End of the current billing period",
        },
        {
          "value": "custom",
          "label": "On a custom date",
        },
      ],
    },
    {
      "key": "scheduleDate",
      "label": "Schedule date",
      "type": "string",
      "hint": "YYYY-MM-DD. Required when Cancel when is custom.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Subscription id",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Status",
    },
  ],

  async execute(input, ctx) {
    if (input.cancelWhen === "custom" && !input.scheduleDate) {
      throw new Error("Schedule date is required when Cancel when is custom");
    }
    return await new SamCartClient(ctx).call(
      "POST",
      `/subscriptions/${intId(input.subscriptionId, "Subscription ID")}/scheduleCancel`,
      {
        json: {
          cancel_when: input.cancelWhen,
          schedule_date: input.scheduleDate,
        },
      },
    );
  },
};

export default subscriptionScheduleCancel;
