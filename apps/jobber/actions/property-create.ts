import type { ActionDefinition } from "@w6w/types";
import { ADDRESS_FIELDS, compact, JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  clientId: string;
  name?: string;
  street1: string;
  street2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

const MUTATION = `
  mutation CreateProperty($clientId: EncodedId!, $input: PropertyCreateInput!) {
    propertyCreate(clientId: $clientId, input: $input) {
      properties { id name address { id ${ADDRESS_FIELDS} } }
      client { id name }
      userErrors { message path }
    }
  }
`;

/**
 * Two shapes worth knowing about this mutation:
 *
 *   - The client is an **argument**, not a field of the input — a property
 *     always belongs to exactly one client.
 *   - `PropertyCreateInput` wraps a **list**: `{ properties: [ ... ] }`. It can
 *     create several at once. This action creates one, because a form that
 *     collects a variable number of addresses is worse than calling the action
 *     twice; batch creation is available through `graphql-query`.
 *
 * `address` is `AddressAttributes!` on the wire — non-null — so a property with
 * no street is not creatable. `street1` is required here for that reason.
 */
const propertyCreate: ActionDefinition<Input> = {
  key: "property-create",
  type: "perform",
  resource: "property",
  title: "Create Property",
  description: "Add a serviced property to a client. Returns the created property with its id.",
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    {
      key: "name",
      label: "Property name",
      type: "string",
      hint: 'Optional label, e.g. "North warehouse". Jobber shows the address when this is blank.',
    },
    { key: "street1", label: "Street", type: "string", required: true, row: "addr1" },
    { key: "street2", label: "Street 2", type: "string", row: "addr1" },
    { key: "city", label: "City", type: "string", row: "addr2" },
    { key: "province", label: "State / province", type: "string", row: "addr2" },
    { key: "postalCode", label: "Postal code", type: "string", row: "addr3" },
    { key: "country", label: "Country", type: "string", row: "addr3" },
  ],
  output: [{ key: "properties", type: "array", label: "The created properties" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      clientId: input.clientId,
      input: {
        properties: [compact({
          name: input.name,
          address: compact({
            street1: input.street1,
            street2: input.street2,
            city: input.city,
            province: input.province,
            postalCode: input.postalCode,
            country: input.country,
          }),
        })],
      },
    });
    return unwrap(data, "propertyCreate");
  },
};

export default propertyCreate;
