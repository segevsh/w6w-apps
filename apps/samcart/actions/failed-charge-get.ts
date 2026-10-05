import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/failed-charges/{chargeId}` */
interface Input {
  chargeId: number;
  createdAtMin?: string;
  createdAtMax?: string;
  testMode?: string;
}

const failedChargeGet: ActionDefinition<Input> = {
  key: "failed-charge-get",
  type: "read",
  resource: "charge",
  title: "Get Failed Charge",
  description: "One failed charge, including the processor error.",
  params: [
    {
      "key": "chargeId",
      "label": "Failed charge ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
    {
      "key": "createdAtMin",
      "label": "Created at or after",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 00:00:00 UTC.",
    },
    {
      "key": "createdAtMax",
      "label": "Created at or before",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 23:59:59 UTC.",
    },
    {
      "key": "testMode",
      "label": "Test mode",
      "type": "select",
      "options": [
        {
          "value": "true",
          "label": "Test only",
        },
        {
          "value": "false",
          "label": "Live only",
        },
      ],
      "hint": "Leave empty for both.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Charge id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/failed-charges/${intId(input.chargeId, "Failed charge ID")}`,
      {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
          test_mode: input.testMode,
        },
      },
    );
  },
};

export default failedChargeGet;
