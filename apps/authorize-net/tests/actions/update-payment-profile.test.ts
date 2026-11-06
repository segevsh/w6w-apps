import { test } from "node:test";
import action from "../../actions/update-payment-profile.ts";
import { checkAction } from "../_contract.ts";

test("update-payment-profile: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "updateCustomerPaymentProfileRequest"));
