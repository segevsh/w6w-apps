import { assert, assertEquals } from "@std/assert";
import lookupRcs from "../../actions/lookup-rcs.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "number": "4917612345678", "from": "agent1" } as Parameters<
  typeof lookupRcs.execute
>[0];

Deno.test("lookup-rcs: GET /api/lookup/rcs with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "rcs_capabilities": ["ACTION_DIAL"] },
  }]);
  const out = await lookupRcs.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/lookup/rcs");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "number": "4917612345678", "from": "agent1" });
  assertEquals(calls[0].body, null);
  assertEquals(out.rcs_capabilities, ["ACTION_DIAL"]);
});

Deno.test("lookup-rcs: declares type read-or-search and every required param", () => {
  const required = (lookupRcs.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(lookupRcs.type));
  assertEquals(lookupRcs.type === "perform", false);
});

Deno.test("lookup-rcs: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await lookupRcs.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
