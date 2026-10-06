import { deleteAction } from "../lib/factory.ts";

export default deleteAction({
  key: "account-delete",
  title: "Delete Account",
  noun: "Account",
  type: "account",
  path: "accounts",
  description: "Permanently delete an account by ID.",
});
