import { test } from "node:test";
import action from "../../actions/list-subscriptions.ts";
import { checkAction } from "../_contract.ts";

test("list-subscriptions: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "ARBGetSubscriptionListRequest"));
