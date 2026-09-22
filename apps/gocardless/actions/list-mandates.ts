import type { ActionDefinition } from "@w6w/types";
import { GoCardlessClient, type ListPage } from "../lib/client.ts";
import {
  dateFilterParams,
  dateFilterQuery,
  enumishParam,
  idFilterParam,
  listOutput,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /mandates` — one page of this merchant's mandates.
 *
 * A mandate is the customer's authorisation to debit their bank account; every
 * payment and subscription points at one. `reference` is the one filter a
 * workflow can usually key on, because it is the value the merchant themselves
 * supplied when the mandate was set up (typically an invoice or customer number)
 * — the mandate id is GoCardless's.
 *
 * `status`, `scheme` and `mandate_type` are passed through verbatim rather than
 * narrowed to a `select`: they are GoCardless's own enums, the vendor validates
 * them, and a list frozen into this app would reject a value GoCardless adds
 * later.
 */
interface Input {
  limit?: number;
  after?: string;
  before?: string;
  customer?: string;
  creditor?: string;
  customerBankAccount?: string;
  status?: string;
  scheme?: string;
  mandateType?: string;
  reference?: string;
  createdAtGt?: string;
  createdAtGte?: string;
  createdAtLt?: string;
  createdAtLte?: string;
}

const listMandates: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "list-mandates",
  type: "search",
  resource: "mandate",
  title: "List Mandates",
  description:
    "Search mandates, one cursor page at a time — the debit authorisations behind every " +
    "payment and subscription.",
  params: [
    ...paginationParams(),
    idFilterParam("customer", "Customer ID", "Only mandates belonging to this customer."),
    idFilterParam("creditor", "Creditor ID", "Only mandates against this creditor account."),
    idFilterParam(
      "customerBankAccount",
      "Customer bank account ID",
      "Only mandates against this specific bank account (sent as `customer_bank_account`).",
    ),
    enumishParam(
      "status",
      "Status",
      "GoCardless's own mandate `status` values (e.g. `pending_customer_approval`, `active`, " +
        "`cancelled`, `failed`, `expired`).",
    ),
    enumishParam(
      "scheme",
      "Scheme",
      "The bank scheme the mandate runs on, e.g. `bacs`, `sepa_core`, `ach`, `autogiro`.",
    ),
    enumishParam(
      "mandateType",
      "Mandate type",
      "Sent as `mandate_type`. GoCardless's own values, e.g. `one_off` or a recurring type.",
    ),
    {
      key: "reference",
      label: "Reference",
      type: "string",
      advanced: true,
      hint: "Your own reference, as recorded on the mandate when it was created — usually the " +
        "invoice or customer number.",
    },
    ...dateFilterParams({ prefix: "createdAt", label: "Created", field: "created_at" }),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new GoCardlessClient(ctx).list("mandates", "/mandates", {
      limit: input.limit,
      after: input.after,
      before: input.before,
      customer: input.customer,
      creditor: input.creditor,
      customer_bank_account: input.customerBankAccount,
      status: input.status,
      scheme: input.scheme,
      mandate_type: input.mandateType,
      reference: input.reference,
      ...dateFilterQuery("created_at", {
        gt: input.createdAtGt,
        gte: input.createdAtGte,
        lt: input.createdAtLt,
        lte: input.createdAtLte,
      }),
    });
  },
};

export default listMandates;
