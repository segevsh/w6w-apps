import { test } from "node:test";
import action from "../../actions/get-transaction.ts";
import { checkAction } from "../_contract.ts";

test("get-transaction: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getTransactionDetailsRequest"));
