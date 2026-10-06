import { assertEquals } from "@std/assert";
import action from "../../actions/issue-snooze.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-snooze: POSTs snooze_until and returns the issue", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "i1", state: "on_hold" } } }]);
  const out = await action.execute!({ id: "7", snoozeUntil: "2026-12-01T09:00:00Z" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/7/snooze");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { snooze_until: "2026-12-01T09:00:00Z" });
  assertEquals(out, { id: "i1", state: "on_hold" });
});

Deno.test("issue-snooze: snoozeUntil is required", () => {
  assertEquals(action.params!.find((p) => p.key === "snoozeUntil")?.required, true);
});
