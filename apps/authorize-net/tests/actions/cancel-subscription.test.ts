import { test } from "node:test";
import action from "../../actions/cancel-subscription.ts";
import { checkAction } from "../_contract.ts";

test("cancel-subscription: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "ARBCancelSubscriptionRequest"));
