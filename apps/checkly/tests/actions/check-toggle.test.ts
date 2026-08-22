import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-toggle.ts";

/** Deactivating loses history; muting keeps it. Different switches. */
Deno.test("check-toggle: sends only the switch it was asked to flip", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1" } }]);
  await action.execute!({ checkId: "c1", muted: "true" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/checks/c1");
  assertEquals(JSON.parse(calls[0].body!), { muted: true });
});

/** `false` is a real setting and must not be dropped as falsy. */
Deno.test("check-toggle: turning something off sends an explicit false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ checkId: "c1", activated: "false", muted: "false" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { activated: false, muted: false });
});

Deno.test("check-toggle: an unset switch is left alone", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ checkId: "c1", activated: "true", muted: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { activated: true });
});

Deno.test("check-toggle: a call that changes nothing is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ checkId: "c1" }, ctx),
    Error,
    "nothing to change",
  );
  assertEquals(calls.length, 0);
});

Deno.test("check-toggle: the hints explain which switch loses history", () => {
  const params = action.params as Array<{ key: string; hint?: string }>;
  assert(params.find((p) => p.key === "activated")!.hint!.includes("no history"));
  assert(params.find((p) => p.key === "muted")!.hint!.includes("still recorded"));
});
