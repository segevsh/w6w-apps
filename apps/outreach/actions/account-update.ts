import { updateAction } from "../lib/factory.ts";
import { accountAttrParams, accountRelFieldParams, accountRelParams } from "./account-create.ts";

export default updateAction({
  key: "account-update",
  title: "Update Account",
  noun: "Account",
  type: "account",
  path: "accounts",
  description: "Update an account. Only the fields you supply change.",
  attrParams: accountAttrParams,
  relParams: accountRelParams,
  relFieldParams: accountRelFieldParams,
});
