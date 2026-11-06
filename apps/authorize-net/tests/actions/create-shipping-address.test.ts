import { test } from "node:test";
import action from "../../actions/create-shipping-address.ts";
import { checkAction } from "../_contract.ts";

test("create-shipping-address: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "createCustomerShippingAddressRequest"));
