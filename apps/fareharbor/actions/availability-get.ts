import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { availabilityParam, companyParam, detailedParam, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  availabilityPk: number | string;
  detailed?: boolean;
}

const availabilityGet: ActionDefinition<Input> = {
  key: "availability-get",
  type: "read",
  resource: "availability",
  title: "Get Availability",
  description:
    "Fetch one availability (a bookable time slot) with its capacity, customer type rates and custom fields.",
  params: [
    companyParam,
    availabilityParam,
    detailedParam,
  ],
  output: [
    { key: "availability", type: "object", label: "Availability" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/`,
      {
        query: { detailed: input.detailed },
      },
    );
  },
};

export default availabilityGet;
