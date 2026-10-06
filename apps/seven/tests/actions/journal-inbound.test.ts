import { assert, assertEquals } from "@std/assert";
import journalInbound from "../../actions/journal-inbound.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "limit": 5 } as Parameters<typeof journalInbound.execute>[0];

Deno.test("journal-inbound: GET /api/journal/inbound with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "4603396", "text": "hi" }] }]);
  const out = await journalInbound.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/journal/inbound");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "limit": "5" });
  assertEquals(calls[0].body, null);
  assertEquals((out.entries as unknown[]).length, 1);
});

Deno.test("journal-inbound: declares type read-or-search and every required param", () => {
  const required = (journalInbound.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(journalInbound.type));
  assertEquals(journalInbound.type === "perform", false);
});

Deno.test("journal-inbound: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await journalInbound.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
