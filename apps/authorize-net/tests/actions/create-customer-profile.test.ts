import { test } from "node:test";
import action from "../../actions/create-customer-profile.ts";
import { checkAction } from "../_contract.ts";

test("create-customer-profile: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "createCustomerProfileRequest"));
