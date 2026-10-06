import { assert, assertEquals } from "@std/assert";
import lookupHlr from "../../actions/lookup-hlr.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "number": ["4917612345678"] } as Parameters<typeof lookupHlr.execute>[0];

Deno.test("lookup-hlr: GET /api/lookup/hlr with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "status": true, "valid_number": "valid", "reachable": "unknown" },
  }]);
  const out = await lookupHlr.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/lookup/hlr");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "number": "4917612345678" });
  assertEquals(calls[0].body, null);
  assertEquals(out.valid_number, "valid");
});

Deno.test("lookup-hlr: declares type read-or-search and every required param", () => {
  const required = (lookupHlr.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(lookupHlr.type));
  assertEquals(lookupHlr.type === "perform", false);
});

Deno.test("lookup-hlr: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await lookupHlr.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
