import type { ActionDefinition } from "@w6w/types";
import { compact, LoopClient, splitList } from "../lib/client.ts";

/**
 * Upsert Customer.
 *
 * `PUT /customers` (Customers scope). Keyed on `external_id`; `sales_channel` is required and creates the channel if the shop does not have it yet. Answers HTTP 201.
 */
interface Input {
  externalId: string;
  salesChannel: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string;
}

const action: ActionDefinition<Input> = {
  key: "customer-upsert",
  type: "perform",
  resource: "customer",
  title: "Upsert Customer",
  description: "Create a customer, or update the one that already has this external ID.",
  idempotent: true,
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "Your own identifier for the customer; must be unique.",
    },
    {
      key: "salesChannel",
      label: "Sales channel",
      type: "string",
      required: true,
      hint: "Channel name, e.g. `shopify`. Created if new to the shop.",
      validation: { maxLength: 255 },
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      validation: { maxLength: 50 },
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      validation: { maxLength: 50 },
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tags.",
    },
  ],
  output: [
    {
      key: "customer",
      type: "object",
      label: "The customer: id, external_id, sales_channel, names, email, phone, tags",
    },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).put(
      "/customers",
      compact({
        external_id: input.externalId,
        sales_channel: input.salesChannel,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        tags: splitList(input.tags),
      }),
    ) as Record<string, unknown>;
    return { customer: res.customer ?? res };
  },
};

export default action;
