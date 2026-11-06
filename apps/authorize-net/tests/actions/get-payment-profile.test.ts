import { test } from "node:test";
import action from "../../actions/get-payment-profile.ts";
import { checkAction } from "../_contract.ts";

test("get-payment-profile: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getCustomerPaymentProfileRequest"));
