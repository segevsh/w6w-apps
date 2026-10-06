import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const roleList: ActionDefinition<Input> = {
  key: "role-list",
  type: "read",
  resource: "role",
  title: "List Roles",
  description: "List the crew roles defined for a company.",
  params: [
    companyParam,
  ],
  output: [
    { key: "roles", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(`/companies/${seg(input.shortname, "shortname")}/roles/`);
  },
};

export default roleList;
