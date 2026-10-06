import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import { activeParam, idsParam, listOutput, pagingParams, pagingQuery } from "../lib/params.ts";

/** `GET /settings/v2/tenant/{tenant}/business-units`. */
interface Input {
  ids?: string;
  name?: string;
  active?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const businessUnitList: ActionDefinition<Input> = {
  key: "business-unit-list",
  type: "search",
  resource: "business-unit",
  title: "List Business Units",
  description: "List the tenant's business units — the ids that jobs and leads are booked against.",
  params: [
    idsParam,
    { key: "name", label: "Name", type: "string", hint: 'Case-insensitive "contains" match.' },
    activeParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("settings", "/business-units", {
      query: compact({
        ids: idList(input.ids),
        name: input.name,
        active: input.active,
        ...pagingQuery(input),
      }),
    });
  },
};

export default businessUnitList;
