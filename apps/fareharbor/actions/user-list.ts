import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Company Users",
  description:
    "List the users of a company (name, username) \u2014 the usernames that crew members are assigned by.",
  params: [
    companyParam,
  ],
  output: [
    { key: "users", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(`/companies/${seg(input.shortname, "shortname")}/users/`);
  },
};

export default userList;
