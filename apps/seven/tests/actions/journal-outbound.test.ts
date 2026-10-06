import { assert, assertEquals } from "@std/assert";
import journalOutbound from "../../actions/journal-outbound.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "to": "4917612345678",
  "state": "DELIVERED",
  "limit": 10,
  "offset": 20,
  "date_from": "2026-09-01",
} as Parameters<typeof journalOutbound.execute>[0];

Deno.test("journal-outbound: GET /api/journal/outbound with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "1", "dlr": "DELIVERED" }] }]);
  const out = await journalOutbound.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/journal/outbound");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "to": "4917612345678",
    "state": "DELIVERED",
    "limit": "10",
    "offset": "20",
    "date_from": "2026-09-01",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out.entries as unknown[]).length, 1);
});

Deno.test("journal-outbound: declares type read-or-search and every required param", () => {
  const required = (journalOutbound.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(journalOutbound.type));
  assertEquals(journalOutbound.type === "perform", false);
});

Deno.test("journal-outbound: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await journalOutbound.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
