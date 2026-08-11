import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, PARTNER_ONLY_NOTE } from "../lib/params.ts";

/**
 * `GET /service_zones` — the company's service zones, optionally filtered to the
 * one covering a zip code or an address.
 *
 * The filters are the useful part: passing a customer's zip answers "do we serve
 * here", which is otherwise a client-side comparison against the whole zone list.
 */
interface Input {
  zipCode?: string;
  address?: string;
  page?: number;
  pageSize?: number;
  companyId?: string;
}

const serviceZoneList: ActionDefinition<Input, NormalizedList> = {
  key: "service-zone-list",
  type: "read",
  resource: "company",
  title: "Get Service Zones",
  description:
    "List service zones, optionally filtered by zip code or address — which answers whether a " +
    "given address is served at all. " + PARTNER_ONLY_NOTE,
  params: [
    { key: "zipCode", label: "ZIP code", type: "string", hint: "Filters to zones covering it." },
    { key: "address", label: "Address", type: "string", hint: "Filters to zones covering it." },
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Service zones"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/service_zones", "service_zones", {
      companyId: input.companyId,
      query: {
        zip_code: input.zipCode,
        address: input.address,
        page: input.page,
        page_size: input.pageSize,
      },
    });
  },
};

export default serviceZoneList;
