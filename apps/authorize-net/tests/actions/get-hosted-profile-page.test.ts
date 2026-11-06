import { test } from "node:test";
import action from "../../actions/get-hosted-profile-page.ts";
import { checkAction } from "../_contract.ts";

test("get-hosted-profile-page: signed request matches the vendor example byte-for-byte after recursively reversing input keys", () =>
  checkAction(action, "getHostedProfilePageRequest"));
