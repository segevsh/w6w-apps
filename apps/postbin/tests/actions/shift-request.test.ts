import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shift-request.ts";

test("shift-request: GETs /api/bin/:binId/req/shift", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        method: "GET",
        path: "/YS4il4gS",
        headers: {},
        query: {},
        body: {},
        ip: "1.2.3.4",
        binId: "YS4il4gS",
        inserted: 1439468475026,
      },
    },
  ]);
  const out = await action.execute({ binId: "YS4il4gS" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin/YS4il4gS/req/shift");
  assertEquals(out.binId, "YS4il4gS");
});

test("shift-request: type is perform, not idempotent (it mutates the bin's queue)", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
