import { test } from "node:test";
import action from "../../actions/list-batch-transactions.ts";
import { checkAction } from "../_contract.ts";

test("list-batch-transactions: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getTransactionListRequest"));
