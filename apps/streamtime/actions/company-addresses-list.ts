import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /companies/{company_id}/addresses` — a company's addresses.
 *
 * Read-only in full: the schema gives every field `readOnly: true`, so the API
 * document offers no way to add or edit an address, and this app does not
 * invent one.
 */
interface Input {
  companyId: number;
}

const companyAddressesList: ActionDefinition<Input> = {
  key: "company-addresses-list",
  type: "search",
  resource: "company",
  title: "List Company Addresses",
  description: "List the addresses recorded against a company.",
  params: [idParam("companyId", "Company ID")],
  output: [{ key: "addresses", type: "array", label: "Addresses" }],

  async execute(input, ctx) {
    const addresses = await new StreamtimeClient(ctx).request<unknown[]>(
      `/companies/${encodeId(input.companyId)}/addresses`,
    );
    return { addresses: addresses ?? [] };
  },
};

export default companyAddressesList;
