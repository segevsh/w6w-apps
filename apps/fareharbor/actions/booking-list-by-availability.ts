import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { availabilityParam, companyParam, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  availabilityPk: number | string;
}

const bookingListByAvailability: ActionDefinition<Input> = {
  key: "booking-list-by-availability",
  type: "read",
  resource: "booking",
  title: "List Bookings for Availability",
  description: "List the bookings made against one availability.",
  params: [
    companyParam,
    availabilityParam,
  ],
  output: [
    { key: "bookings", type: "array", label: "Bookings" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/bookings/`,
    );
  },
};

export default bookingListByAvailability;
