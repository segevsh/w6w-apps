import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-create.ts";

test("property-create: builds the parent resource name from the account id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "properties/9" } }], {
    display: {},
  });
  await action.execute!({
    accountId: "456",
    displayName: "Acme Web",
    timeZone: "America/New_York",
    currencyCode: "USD",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties");
  assertEquals(JSON.parse(calls[0].body!), {
    parent: "accounts/456",
    displayName: "Acme Web",
    timeZone: "America/New_York",
    currencyCode: "USD",
  });
});

test("property-create: account, name and time zone are all required", async () => {
  for (
    const [patch, needle] of [
      [{ displayName: "A", timeZone: "UTC" }, "accountId"],
      [{ accountId: "1", timeZone: "UTC" }, "displayName"],
      [{ accountId: "1", displayName: "A" }, "timeZone"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], { display: {} });
    await assertRejects(async () => await action.execute!(patch, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});
