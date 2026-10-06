import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const deskList: ActionDefinition<Input> = {
  key: "desk-list",
  type: "read",
  resource: "desk",
  title: "List Desks",
  description: "List the desks of an affiliate company. Affiliate keys only.",
  params: [
    companyParam,
  ],
  output: [
    { key: "desks", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(`/companies/${seg(input.shortname, "shortname")}/desks/`);
  },
};

export default deskList;
