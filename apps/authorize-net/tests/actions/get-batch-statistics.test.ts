import { test } from "node:test";
import action from "../../actions/get-batch-statistics.ts";
import { checkAction } from "../_contract.ts";

test("get-batch-statistics: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getBatchStatisticsRequest"));
