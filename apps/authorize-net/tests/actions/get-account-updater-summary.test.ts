import { test } from "node:test";
import action from "../../actions/get-account-updater-summary.ts";
import { checkAction } from "../_contract.ts";

test("get-account-updater-summary: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getAUJobSummaryRequest"));
