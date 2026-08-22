import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-alert-list.ts";

/** Alerts sent is a narrower set than failures recorded. */
Deno.test("check-alert-list: reads the account's alerts by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "a1" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "a1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/check-alerts");
});

Deno.test("check-alert-list: a check id narrows it to that check's path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ checkId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/check-alerts/c1");
  assert(action.description!.includes("not the same as the failures"), action.description);
});
