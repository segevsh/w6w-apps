import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/check-lookup-status.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("check-lookup-status: sends repeated ids to /person/checkStatus and summarises progress", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1, status: "complete", name: "A" }, { id: 2, status: "searching" }],
  }]);
  const out = await run(action, { ids: "1, 2" }, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/person/checkStatus?ids=1&ids=2");
  assertEquals([out.count, out.pending, out.allComplete], [2, 1, false]);
  assertEquals(out.profiles[0].name, "A");
});

Deno.test("check-lookup-status: all complete; bad ids are refused before any request", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1, status: "complete" }] }]);
  assertEquals((await run(action, { ids: "1" }, ctx)).allComplete, true);
  const none = mockCtx();
  await assertRejects(() => run(action, { ids: "abc" }, none.ctx), Error, "positive integers");
  await assertRejects(() => run(action, { ids: "" }, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
});

Deno.test("check-lookup-status: a 401 throws the vendor detail", async () => {
  const bad = mockCtx([{ status: 401, body: { detail: "Invalid API key" } }]);
  await assertRejects(() => run(action, { ids: "1" }, bad.ctx), Error, "Invalid API key");
});
