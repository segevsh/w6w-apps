import { assert, assertEquals } from "@std/assert";
import analyticsGet from "../../actions/analytics-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "start": "2026-09-01", "end": "2026-09-30", "group_by": "country" } as Parameters<
  typeof analyticsGet.execute
>[0];

Deno.test("analytics-get: GET /api/analytics with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "date": "2026-09-01", "sms": 3 }] }]);
  const out = await analyticsGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/analytics");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "start": "2026-09-01",
    "end": "2026-09-30",
    "group_by": "country",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out.rows as unknown[]).length, 1);
});

Deno.test("analytics-get: declares type read-or-search and every required param", () => {
  const required = (analyticsGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(analyticsGet.type));
  assertEquals(analyticsGet.type === "perform", false);
});

Deno.test("analytics-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await analyticsGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
