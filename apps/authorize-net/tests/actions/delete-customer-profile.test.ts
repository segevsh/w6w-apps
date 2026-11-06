import { test } from "node:test";
import action from "../../actions/delete-customer-profile.ts";
import { checkAction } from "../_contract.ts";

test("delete-customer-profile: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "deleteCustomerProfileRequest"));
