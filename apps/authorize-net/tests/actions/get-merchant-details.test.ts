import { test } from "node:test";
import action from "../../actions/get-merchant-details.ts";
import { checkAction } from "../_contract.ts";

test("get-merchant-details: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getMerchantDetailsRequest"));
