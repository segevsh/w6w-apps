import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-get.ts";

Deno.test("check-get: reads one check by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1", activated: false } }]);
  const result = await action.execute!({ checkId: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/checks/c1");
  assertEquals(result.activated, false);
});

/** A deactivated check is still listed and is monitoring nothing. */
Deno.test("check-get: the output says what activated and muted mean", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "activated")!.label.includes("monitors nothing"));
  assert(outputs.find((o) => o.key === "muted")!.label.includes("does not alert"));
});

Deno.test("check-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`checkId`");
  assertEquals(calls.length, 0);
});
