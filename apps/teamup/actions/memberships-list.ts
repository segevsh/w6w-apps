/**
 * `GET /api/v2/memberships` — the sellable plans.
 *
 * A **membership** in TeamUp is the product, not a purchase: the pack, the
 * recurring plan or the prepaid plan a business offers. A customer holding one
 * is a *customer membership* (`customer-memberships-list`), and the two are
 * separate resources on purpose — changing a plan's price is not the same
 * operation as changing what one customer pays.
 *
 * The filters separate the questions a front desk asks: `for_sale` and
 * `visible_to_customers` are what may be bought, `is_dropin` singles out
 * single-session products, `name_contains` is the loose lookup,
 * `allow_repeat_purchases` the ones a customer may buy more than once, and
 * `permits_registration_for_event` takes an event id and filters to the plans
 * that can pay for it. `categories`, `forms` and `waivers` are comma-separated
 * id lists.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  categories?: string;
  offering_type?: number;
  is_dropin?: boolean;
  for_sale?: boolean;
  visible_to_customers?: boolean;
  allow_repeat_purchases?: boolean;
  permits_registration_for_event?: number;
  name_contains?: string;
  forms?: string;
  waivers?: string;
}

const action: ActionDefinition<Input> = {
  key: "memberships-list",
  type: "search",
  resource: "membership",
  title: "List Memberships",
  description:
    "List the sellable membership plans and packs, filtered by category, offering type, drop-in " +
    "status and availability (GET /api/v2/memberships).",
  params: [
    {
      key: "categories",
      label: "Category IDs",
      type: "string",
      hint: "Comma-separated category ids.",
    },
    {
      key: "offering_type",
      label: "Offering type ID",
      type: "number",
      validation: { integer: true },
      hint: "Only plans for this class type.",
    },
    {
      key: "is_dropin",
      label: "Drop-ins only",
      type: "boolean",
      hint: "Only single-session products.",
    },
    {
      key: "for_sale",
      label: "For sale only",
      type: "boolean",
      hint: "Only plans that may be bought.",
    },
    { key: "visible_to_customers", label: "Visible to customers only", type: "boolean" },
    {
      key: "allow_repeat_purchases",
      label: "Repeat purchases only",
      type: "boolean",
      hint: "Only plans a customer may buy more than once.",
    },
    {
      key: "permits_registration_for_event",
      label: "Permits registration for event",
      type: "number",
      validation: { integer: true },
      hint: "Event id — filters to the plans that can pay for that event.",
    },
    {
      key: "name_contains",
      label: "Name contains",
      type: "string",
      hint: "Loose lookup by plan name.",
    },
    { key: "forms", label: "Form IDs", type: "string", hint: "Comma-separated form ids." },
    { key: "waivers", label: "Waiver IDs", type: "string", hint: "Comma-separated waiver ids." },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/memberships", {
      query: {
        ...paginationQuery(input),
        categories: input.categories,
        offering_type: input.offering_type,
        is_dropin: input.is_dropin,
        for_sale: input.for_sale,
        visible_to_customers: input.visible_to_customers,
        allow_repeat_purchases: input.allow_repeat_purchases,
        permits_registration_for_event: input.permits_registration_for_event,
        name_contains: input.name_contains,
        forms: input.forms,
        waivers: input.waivers,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
