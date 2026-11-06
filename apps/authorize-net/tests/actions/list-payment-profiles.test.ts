import { test } from "node:test";
import action from "../../actions/list-payment-profiles.ts";
import { checkAction } from "../_contract.ts";

test("list-payment-profiles: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getCustomerPaymentProfileListRequest"));
