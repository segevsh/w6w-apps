import { test } from "node:test";
import action from "../../actions/create-transaction.ts";
import { checkAction } from "../_contract.ts";

test("create-transaction: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "createTransactionRequest"));
