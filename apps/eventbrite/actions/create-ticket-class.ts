import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  name?: string;
  description?: string;
  cost?: string;
  sorting?: number;
  capacity?: number;
  donation?: boolean;
  free?: boolean;
  includeFee?: boolean;
  splitFee?: boolean;
  hideDescription?: boolean;
  salesChannels?: unknown[];
  salesStart?: string;
  salesEnd?: string;
  salesEndRelative?: Record<string, unknown>;
  salesStartAfter?: string;
  minimumQuantity?: number;
  maximumQuantity?: number;
  autoHide?: boolean;
  autoHideBefore?: string;
  autoHideAfter?: string;
  hasPdfTicket?: boolean;
  hidden?: boolean;
  orderConfirmationMessage?: string;
  deliveryMethods?: unknown[];
  inventoryTierId?: string;
  extra?: Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "create-ticket-class",
  type: "perform",
  idempotent: false,
  resource: "ticket_class",
  title: "Create Ticket Class",
  description: "Create a new ticket class on an Eventbrite event.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "string" },
    {
      key: "cost",
      label: "Cost",
      type: "string",
      hint: 'Currency,minor units, e.g. "USD,4500" for $45. Currency must match the event.',
    },
    { key: "sorting", label: "Sorting", type: "number" },
    { key: "capacity", label: "Capacity", type: "number" },
    { key: "donation", label: "Donation", type: "boolean" },
    { key: "free", label: "Free", type: "boolean" },
    { key: "includeFee", label: "Include fee in price", type: "boolean" },
    { key: "splitFee", label: "Split fee", type: "boolean" },
    { key: "hideDescription", label: "Hide description", type: "boolean" },
    {
      key: "salesChannels",
      label: "Sales channels",
      type: "array",
      item: { type: "string" },
      hint: 'e.g. ["online"], ["online","atd"], ["atd"].',
    },
    {
      key: "salesStart",
      label: "Sales start (UTC datetime)",
      type: "string",
      hint: "e.g. 2026-10-01T10:00:00Z",
    },
    {
      key: "salesEnd",
      label: "Sales end (UTC datetime)",
      type: "string",
      hint: "Not allowed on series parent tickets.",
    },
    {
      key: "salesEndRelative",
      label: "Sales end relative",
      type: "json",
      hint:
        "Series parent tickets only: {relative_to_event: start_time|end_time, offset: seconds}.",
    },
    { key: "salesStartAfter", label: "Sales start after (ticket class ID)", type: "string" },
    { key: "minimumQuantity", label: "Minimum per order", type: "number" },
    { key: "maximumQuantity", label: "Maximum per order", type: "number" },
    { key: "autoHide", label: "Auto hide", type: "boolean" },
    { key: "autoHideBefore", label: "Auto hide before (datetime)", type: "string" },
    { key: "autoHideAfter", label: "Auto hide after (datetime)", type: "string" },
    { key: "hasPdfTicket", label: "Include PDF ticket", type: "boolean" },
    { key: "hidden", label: "Hidden", type: "boolean" },
    { key: "orderConfirmationMessage", label: "Order confirmation message", type: "string" },
    {
      key: "deliveryMethods",
      label: "Delivery methods",
      type: "array",
      item: { type: "string" },
      hint: "electronic, will_call, standard_shipping, third_party_shipping.",
    },
    {
      key: "inventoryTierId",
      label: "Inventory tier ID",
      type: "string",
      hint: "Required for tiered-inventory events and add-ons.",
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      hint:
        "Merged (deep) into the request object for any field not listed above, using Eventbrite's snake_case names.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "description", type: "string", label: "Description" },
    { key: "cost", type: "object", label: "Cost" },
    { key: "capacity", type: "number", label: "Capacity" },
    { key: "quantity_total", type: "number", label: "Quantity total" },
    { key: "quantity_sold", type: "number", label: "Quantity sold" },
    { key: "sales_start", type: "string", label: "Sales start" },
    { key: "sales_end", type: "string", label: "Sales end" },
    { key: "hidden", type: "boolean", label: "Hidden" },
    { key: "free", type: "boolean", label: "Free" },
    { key: "donation", type: "boolean", label: "Donation" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.name !== undefined) obj.name = input.name;
    if (input.description !== undefined) obj.description = input.description;
    if (input.cost !== undefined) obj.cost = input.cost;
    if (input.sorting !== undefined) obj.sorting = input.sorting;
    if (input.capacity !== undefined) obj.capacity = input.capacity;
    if (input.donation !== undefined) obj.donation = input.donation;
    if (input.free !== undefined) obj.free = input.free;
    if (input.includeFee !== undefined) obj.include_fee = input.includeFee;
    if (input.splitFee !== undefined) obj.split_fee = input.splitFee;
    if (input.hideDescription !== undefined) obj.hide_description = input.hideDescription;
    if (input.salesChannels !== undefined) obj.sales_channels = input.salesChannels;
    if (input.salesStart !== undefined) obj.sales_start = input.salesStart;
    if (input.salesEnd !== undefined) obj.sales_end = input.salesEnd;
    if (input.salesEndRelative !== undefined) obj.sales_end_relative = input.salesEndRelative;
    if (input.salesStartAfter !== undefined) obj.sales_start_after = input.salesStartAfter;
    if (input.minimumQuantity !== undefined) obj.minimum_quantity = input.minimumQuantity;
    if (input.maximumQuantity !== undefined) obj.maximum_quantity = input.maximumQuantity;
    if (input.autoHide !== undefined) obj.auto_hide = input.autoHide;
    if (input.autoHideBefore !== undefined) obj.auto_hide_before = input.autoHideBefore;
    if (input.autoHideAfter !== undefined) obj.auto_hide_after = input.autoHideAfter;
    if (input.hasPdfTicket !== undefined) obj.has_pdf_ticket = input.hasPdfTicket;
    if (input.hidden !== undefined) obj.hidden = input.hidden;
    if (input.orderConfirmationMessage !== undefined) {
      obj.order_confirmation_message = input.orderConfirmationMessage;
    }
    if (input.deliveryMethods !== undefined) obj.delivery_methods = input.deliveryMethods;
    if (input.inventoryTierId !== undefined) obj.inventory_tier_id = input.inventoryTierId;
    if (input.extra) deepMerge(obj, input.extra);
    return await client.request(`/events/${enc(input.eventId)}/ticket_classes/`, {
      method: "POST",
      body: { ticket_class: obj },
    });
  },
};

export default action;
