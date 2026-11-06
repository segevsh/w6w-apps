import { test } from "node:test";
import action from "../../actions/get-subscription-status.ts";
import { checkAction } from "../_contract.ts";

test("get-subscription-status: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "ARBGetSubscriptionStatusRequest"));
