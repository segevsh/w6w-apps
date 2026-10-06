import { assert, assertEquals } from "@std/assert";
import lookupMnp from "../../actions/lookup-mnp.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "number": "4917612345678" } as Parameters<typeof lookupMnp.execute>[0];

Deno.test("lookup-mnp: GET /api/lookup/mnp with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "code": 100, "mnp": { "mccmnc": "26201" } },
  }]);
  const out = await lookupMnp.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/lookup/mnp");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "number": "4917612345678" });
  assertEquals(calls[0].body, null);
  assertEquals((out.mnp as Record<string, unknown>).mccmnc, "26201");
});

Deno.test("lookup-mnp: declares type read-or-search and every required param", () => {
  const required = (lookupMnp.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(lookupMnp.type));
  assertEquals(lookupMnp.type === "perform", false);
});

Deno.test("lookup-mnp: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await lookupMnp.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
