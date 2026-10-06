import type { ActionDefinition } from "@w6w/types";
import { UpsalesClient } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/**
 * `GET /api/v2/customfields/{entity}` — the custom-field definitions of one object type.
 *
 * Use the returned `id`s as `fieldId` in the `custom` array of a write
 * (`{"custom": [{"fieldId": 3, "value": "2210"}]}`) via the `fields` parameter.
 */
interface Input {
  entity: string;
}

const ENTITIES = [
  "account",
  "contact",
  "activity",
  "appointment",
  "order",
  "orderrow",
  "product",
  "project",
  "user",
  "agreement",
];

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the custom-field definitions for one Upsales object type.",
  params: [
    {
      key: "entity",
      label: "Object type",
      type: "select",
      required: true,
      options: [
        { value: "account", label: "Company" },
        { value: "contact", label: "Contact" },
        { value: "activity", label: "Activity" },
        { value: "appointment", label: "Appointment" },
        { value: "order", label: "Order / opportunity" },
        { value: "orderrow", label: "Order row" },
        { value: "product", label: "Product" },
        { value: "project", label: "Campaign" },
        { value: "user", label: "User" },
        { value: "agreement", label: "Subscription" },
      ],
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    if (!ENTITIES.includes(input.entity)) {
      throw new Error(`entity must be one of: ${ENTITIES.join(", ")}`);
    }
    return new UpsalesClient(ctx).list(`/customfields/${input.entity}`);
  },
};

export default customFieldList;
