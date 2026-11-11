import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/** `GET /programs/{?asset_id}` */
interface Input {
  assetId?: string;
  page?: number;
}

const programList: ActionDefinition<Input> = {
  key: "program-list",
  type: "search",
  resource: "program",
  title: "List Programs",
  description: "List all programs on the account, optionally filtered by asset id.",
  params: [{ key: "assetId", label: "Asset id", type: "string" }, pageParam],
  output: [
    { key: "items", type: "array", label: "Programs" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    const { items, nextPage } = await new TapfiliateClient(ctx).list("/programs/", {
      query: compact({ asset_id: input.assetId, page: input.page }),
    });
    return { items, nextPage };
  },
};

export default programList;
