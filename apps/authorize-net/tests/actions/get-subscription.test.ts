import { test } from "node:test";
import action from "../../actions/get-subscription.ts";
import { checkAction } from "../_contract.ts";

test("get-subscription: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "ARBGetSubscriptionRequest"));
