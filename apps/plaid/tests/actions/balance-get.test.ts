import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/balance-get.ts";

const conn = { display: { environment: "sandbox" } };

test("balance-get: hits the live balance endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/accounts/balance/get");
});

test("balance-get: the freshness option is nested under options", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!(
    { accessToken: "tok", minLastUpdatedDatetime: "2026-08-18T00:00:00Z" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).options.min_last_updated_datetime,
    "2026-08-18T00:00:00Z",
  );
});

/** It reaches the bank, so it is the one call an institution can throttle. */
test("balance-get: says it goes to the bank", () => {
  assert(/bank/.test(action.description!), action.description);
});
