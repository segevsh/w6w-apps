import { assert, assertEquals } from "@std/assert";
import lookupCnam from "../../actions/lookup-cnam.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "number": "4917612345678" } as Parameters<typeof lookupCnam.execute>[0];

Deno.test("lookup-cnam: GET /api/lookup/cnam with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": "true", "code": "100", "name": "GERMANY" },
  }]);
  const out = await lookupCnam.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/lookup/cnam");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "number": "4917612345678" });
  assertEquals(calls[0].body, null);
  assertEquals(out.name, "GERMANY");
});

Deno.test("lookup-cnam: declares type read-or-search and every required param", () => {
  const required = (lookupCnam.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(lookupCnam.type));
  assertEquals(lookupCnam.type === "perform", false);
});

Deno.test("lookup-cnam: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await lookupCnam.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});

Deno.test("lookup-cnam: a miss answers only {code: 600} and is thrown, not returned as a name", async () => {
  const { ctx } = mockCtx([{ body: { code: "600" } }]);
  let message = "";
  try {
    await lookupCnam.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("600") && message.includes("no result"), message);
});
