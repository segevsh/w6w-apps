/**
 * `GET /api/v2/customers/{id}` — one customer.
 *
 * The Customer object is the centre of this app: `customers-list`,
 * `customers-create` and this action all return it. The fields worth knowing
 * before reading the rest of the app:
 *
 *  - `object` is always the literal `"customer"` — it says what `results[]`
 *    holds when a step is handed a list without knowing its type.
 *  - `visibility` is `visible`/`hidden` and `family_role` is
 *    `manager`/`child`: a family account is several customers sharing one
 *    `family` id, and exactly one of them is the manager.
 *  - `is_lead` marks a customer who has not become a member yet, and `status`
 *    is the business's own status for them; `is_status_locked` says whether
 *    TeamUp will let it be changed.
 *  - `invitation_url` is the customer's own way into their account, and
 *    `field_values` carries this business's custom fields, returned exactly as
 *    TeamUp sends them (the reference publishes the array without an element
 *    schema, so nothing here reshapes it).
 *
 * `expand`, `fields` and `format` are documented on every TeamUp operation and
 * are exposed on every action in this app.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { customerOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "customers-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by id, with the full Customer object TeamUp returns (GET " +
    "/api/v2/customers/{id}).",
  params: [
    idParam("The customer `id` from List Customers or Create Customer."),
    ...commonParams(),
  ],
  output: customerOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/customers/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
