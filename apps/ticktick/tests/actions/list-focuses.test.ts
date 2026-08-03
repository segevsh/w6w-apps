import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-focuses.ts";

Deno.test("list-focuses: GETs /focus with from, to and type as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "focus-1" }] }]);
  const out = await action.execute!(
    { from: "2026-04-01T00:00:00+08:00", to: "2026-04-02T00:00:00+08:00", type: 1 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/open/v1/focus");
  assertEquals(url.searchParams.get("from"), "2026-04-01T00:00:00+0800");
  assertEquals(url.searchParams.get("to"), "2026-04-02T00:00:00+0800");
  assertEquals(url.searchParams.get("type"), "1");
  assertEquals(out, { items: [{ id: "focus-1" }], count: 1 });
});

Deno.test("list-focuses: type 0 is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ from: "2026-04-01T00:00:00Z", to: "2026-04-02T00:00:00Z", type: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "0");
});

Deno.test("list-focuses: all three parameters are required", () => {
  for (const key of ["from", "to", "type"]) {
    assert(action.params!.find((p) => p.key === key)?.required, `${key} must be required`);
  }
});

Deno.test("list-focuses: documents the silent 30-day clamp rather than hiding it", () => {
  assert(`${action.description}`.includes("30 days"));
});
