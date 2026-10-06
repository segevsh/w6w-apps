import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { availabilityParam, companyParam, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  availabilityPk: number | string;
}

const crewMemberList: ActionDefinition<Input> = {
  key: "crew-member-list",
  type: "read",
  resource: "crew-member",
  title: "List Crew Members",
  description: "List the crew members assigned to an availability.",
  params: [
    companyParam,
    availabilityParam,
  ],
  output: [
    { key: "crew_members", type: "array", label: "Crew members" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/crew-members/`,
    );
  },
};

export default crewMemberList;
