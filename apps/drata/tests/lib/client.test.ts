import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  baseForRegion,
  compact,
  DrataClient,
  formatDrataError,
  parseRegion,
  toList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: region allowlist and base URLs", () => {
  assertEquals(parseRegion(" EU "), "eu");
  assertEquals(parseRegion("evil.example.com"), undefined);
  assertEquals(baseForRegion(undefined), "https://public-api.drata.com/public/v2");
  assertEquals(baseForRegion("apac"), "https://public-api.apac.drata.com/public/v2");
  try {
    baseForRegion("mars");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("Unknown Drata region"));
  }
});

Deno.test("client: compact drops undefined and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false, e: 0 }), { a: 1, d: false, e: 0 });
  assertEquals(toList("a, b ,"), ["a", "b"]);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: error formatting carries status, code, message and hints", () => {
  assert(formatDrataError(401, errorBody(401, "x", 9)).includes("code 9"));
  assert(formatDrataError(403, errorBody(403, "x")).includes("permission"));
  assert(formatDrataError(412, errorBody(412, "x")).includes("terms"));
  assert(formatDrataError(400, errorBody(400, ["a", "b"])).includes("a; b"));
  assert(formatDrataError(500, null, "boom").includes("boom"));
});

Deno.test("client: the host comes from the connection's region", async () => {
  const eu = mockCtx([{ body: { data: [] } }], { region: "eu" });
  await new DrataClient(eu.ctx).get("/workspaces");
  assertEquals(new URL(eu.calls[0].url).host, "public-api.eu.drata.com");

  const def = mockCtx([{ body: { data: [] } }]);
  await new DrataClient(def.ctx).get("/workspaces");
  assertEquals(new URL(def.calls[0].url).host, "public-api.drata.com");
});

Deno.test("client: array query values repeat the key, and non-ok responses throw", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [] } },
    { status: 500, body: errorBody(500, "oops", 1) },
  ]);
  const c = new DrataClient(ctx);
  await c.get("/users", { "expand[]": ["roles", "x"], size: 2 });
  assertEquals(queryOf(calls[0].url).getAll("expand[]"), ["roles", "x"]);
  await assertRejects(() => c.get("/users"), Error, "HTTP 500");
});
