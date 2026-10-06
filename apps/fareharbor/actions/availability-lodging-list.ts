import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { availabilityParam, companyParam, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  availabilityPk: number | string;
}

const availabilityLodgingList: ActionDefinition<Input> = {
  key: "availability-lodging-list",
  type: "read",
  resource: "lodging",
  title: "List Availability Lodgings",
  description: "List the lodgings an availability can provide transportation to.",
  params: [
    companyParam,
    availabilityParam,
  ],
  output: [
    { key: "lodgings", type: "array", label: "Lodgings" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/lodgings/`,
    );
  },
};

export default availabilityLodgingList;
