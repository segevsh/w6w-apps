import { assert, assertEquals } from "@std/assert";
import lookupFormat from "../../actions/lookup-format.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "number": "4917612345678" } as Parameters<typeof lookupFormat.execute>[0];

Deno.test("lookup-format: GET /api/lookup/format with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "international": "+4917612345678", "carrier": "O2" },
  }]);
  const out = await lookupFormat.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/lookup/format");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "number": "4917612345678" });
  assertEquals(calls[0].body, null);
  assertEquals(out.carrier, "O2");
});

Deno.test("lookup-format: declares type read-or-search and every required param", () => {
  const required = (lookupFormat.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(lookupFormat.type));
  assertEquals(lookupFormat.type === "perform", false);
});

Deno.test("lookup-format: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await lookupFormat.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
