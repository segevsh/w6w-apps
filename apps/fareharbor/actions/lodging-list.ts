import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const lodgingList: ActionDefinition<Input> = {
  key: "lodging-list",
  type: "read",
  resource: "lodging",
  title: "List Lodgings",
  description: "List the lodgings (hotels, pickup locations) a company offers transportation to.",
  params: [
    companyParam,
  ],
  output: [
    { key: "lodgings", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/lodgings/`,
    );
  },
};

export default lodgingList;
