import type { ActionDefinition } from "@w6w/types";
import { compact, KvCoreClient, type KvCoreListPage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  page?: number;
  limit?: number;
}

interface OfficeSummary {
  id: number;
  name?: string;
  type?: string;
  external_vendor_id?: unknown;
}

/** `GET /v2/public/offices` — list offices on the account. Default limit 50, per the vendor. */
const officeList: ActionDefinition<Input> = {
  key: "office-list",
  type: "search",
  resource: "office",
  title: "List Offices",
  description: "List offices on the account.",
  params: paginationParams(),
  output: [
    { key: "data", type: "array", label: "Offices" },
    { key: "total", type: "number", label: "Total offices" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json<KvCoreListPage<OfficeSummary>>("/offices", {
      query: compact({ page: input.page, limit: input.limit }),
    });
  },
};

export default officeList;
