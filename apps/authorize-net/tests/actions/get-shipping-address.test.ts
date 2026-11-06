import { test } from "node:test";
import action from "../../actions/get-shipping-address.ts";
import { checkAction } from "../_contract.ts";

test("get-shipping-address: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getCustomerShippingAddressRequest"));
