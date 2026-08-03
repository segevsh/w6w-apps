import type { ActionDefinition } from "@w6w/types";
import { compact, JobberClient, QUOTE_FIELDS, unwrap } from "../lib/client.ts";

interface LineItemInput {
  name?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxable?: boolean;
}

interface Input {
  clientId: string;
  propertyId: string;
  title?: string;
  message?: string;
  requestId?: string;
  salespersonId?: string;
  taxRateId?: string;
  lineItems?: LineItemInput[];
  sendForApproval?: boolean;
}

/**
 * Note the argument name: `attributes`, not `input`. Jobber is not consistent
 * about this across mutations — `clientCreate` and `requestCreate` take
 * `input`, `quoteCreate` and `quoteEdit` take `attributes` — so the name is
 * transcribed per mutation from the schema rather than assumed.
 */
const MUTATION = `
  mutation CreateQuote($attributes: QuoteCreateAttributes!) {
    quoteCreate(attributes: $attributes) {
      quote { ${QUOTE_FIELDS} lineItems(first: 50) { nodes { id name quantity unitPrice totalPrice } } }
      userErrors { message path }
    }
  }
`;

/**
 * Three required things, and the second one is the trap.
 *
 *   - `clientId` — obvious.
 *   - `propertyId` — **also non-null**. A quote is priced for a location, not
 *     just a customer, and one client can own several serviced properties.
 *     `property-list` (filtered by client) is where this id comes from. There
 *     is no "use the client's default property" spelling.
 *   - `lineItems` — non-null, and each item's `name` and
 *     `saveToProductsAndServices` are non-null in turn. An empty quote is not
 *     creatable through this mutation.
 *
 * `saveToProductsAndServices` is forced to `false` rather than exposed. It
 * decides whether an ad-hoc line becomes a permanent entry in the account's
 * price book; a workflow quietly growing a customer's catalogue on every run is
 * a side effect nobody asked for. Building the catalogue is `product-list`'s
 * subject, and `productOrServiceId` on a line item is available through
 * `graphql-query` for callers who want to reference an existing entry.
 */
const quoteCreate: ActionDefinition<Input> = {
  key: "quote-create",
  type: "perform",
  resource: "quote",
  title: "Create Quote",
  description:
    "Create a quote for a client at a property, with at least one line item. Optionally transition it straight to Awaiting response so the client can act on it.",
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true, row: "who" },
    {
      key: "propertyId",
      label: "Property ID",
      type: "string",
      required: true,
      hint: "Required by Jobber. Use `property-list` filtered by this client to find it.",
      row: "who",
    },
    { key: "title", label: "Title", type: "string" },
    {
      key: "message",
      label: "Client message",
      type: "text",
      hint: "Shown to the client on the quote.",
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Name", type: "string", required: true },
          { key: "description", label: "Description", type: "string" },
          { key: "quantity", label: "Quantity", type: "number", default: 1 },
          { key: "unitPrice", label: "Unit price", type: "number" },
          { key: "taxable", label: "Taxable", type: "boolean" },
        ],
      },
      hint: "At least one. Jobber computes the line total from quantity × unit price.",
    },
    {
      key: "sendForApproval",
      label: "Mark awaiting response",
      type: "boolean",
      hint:
        "Transitions the new quote out of draft. Jobber's only legal transition on create — it does not email the quote.",
    },
    { key: "requestId", label: "Request ID", type: "string", advanced: true },
    { key: "salespersonId", label: "Salesperson user ID", type: "string", advanced: true },
    {
      key: "taxRateId",
      label: "Tax rate ID",
      type: "string",
      hint: "Defaults to the property's tax rate when omitted.",
      advanced: true,
    },
  ],
  output: [{ key: "quote", type: "object", label: "The created quote" }],

  async execute(input, ctx) {
    const lineItems = (input.lineItems ?? [])
      .filter((li) => li && li.name)
      .map((li) =>
        compact({
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxable: li.taxable,
          // Never true — see the note above.
          saveToProductsAndServices: false,
        })
      );

    if (!lineItems.length) {
      throw new Error("quote-create needs at least one line item with a name");
    }

    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      attributes: compact({
        clientId: input.clientId,
        propertyId: input.propertyId,
        title: input.title,
        message: input.message,
        requestId: input.requestId,
        salespersonId: input.salespersonId,
        taxRateId: input.taxRateId,
        transitionQuoteTo: input.sendForApproval ? "AWAITING_RESPONSE" : undefined,
        lineItems,
      }),
    });

    return unwrap(data, "quoteCreate");
  },
};

export default quoteCreate;
