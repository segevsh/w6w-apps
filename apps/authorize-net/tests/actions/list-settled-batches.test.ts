import { test } from "node:test";
import action from "../../actions/list-settled-batches.ts";
import { checkAction } from "../_contract.ts";

test("list-settled-batches: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getSettledBatchListRequest"));
