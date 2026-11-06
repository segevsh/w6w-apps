import { test } from "node:test";
import action from "../../actions/update-held-transaction.ts";
import { checkAction } from "../_contract.ts";

test("update-held-transaction: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "updateHeldTransactionRequest"));
