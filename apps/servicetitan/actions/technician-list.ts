import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import { activeParam, idsParam, listOutput, pagingParams, pagingQuery } from "../lib/params.ts";

/** `GET /settings/v2/tenant/{tenant}/technicians`. */
interface Input {
  ids?: string;
  name?: string;
  active?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const technicianList: ActionDefinition<Input> = {
  key: "technician-list",
  type: "search",
  resource: "technician",
  title: "List Technicians",
  description: "List the tenant's technicians, optionally by name.",
  params: [
    idsParam,
    { key: "name", label: "Name", type: "string", hint: 'Case-insensitive "contains" match.' },
    activeParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("settings", "/technicians", {
      query: compact({
        ids: idList(input.ids),
        name: input.name,
        active: input.active,
        ...pagingQuery(input),
      }),
    });
  },
};

export default technicianList;
