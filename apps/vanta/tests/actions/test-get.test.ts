import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/test-get.ts";

Deno.test("test-get: fetches one test by id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "t1", status: "NEEDS_ATTENTION" })], { display });
  const result = await action.execute!({ testId: "t1" }, ctx) as { status: string };
  assertEquals(calls[0].url, "https://api.vanta.com/v1/tests/t1");
  assertEquals(result.status, "NEEDS_ATTENTION");
});

Deno.test("test-get: needs a test id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "testId");
  assertEquals(calls.length, 0);
});

/** "Is this broken or is the integration broken" needs the integration. */
Deno.test("test-get: says what the extra call is for", () => {
  assert(/integration is broken/.test(action.description!), action.description);
});
