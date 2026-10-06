import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const userCustomFieldsGet: ActionDefinition<Record<string, never>> = {
  key: "user-custom-fields-get",
  type: "read",
  resource: "user",
  title: "Get Custom Registration Fields",
  description: "List the custom user fields defined for the domain.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("getcustomregistrationfields");
  },
};

export default userCustomFieldsGet;
