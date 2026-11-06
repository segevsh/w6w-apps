import { test } from "node:test";
import action from "../../actions/validate-payment-profile.ts";
import { checkAction } from "../_contract.ts";

test("validate-payment-profile: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "validateCustomerPaymentProfileRequest"));
