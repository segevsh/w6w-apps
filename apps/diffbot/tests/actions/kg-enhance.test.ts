import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/kg-enhance.ts";
import { mockCtx, run } from "../_helpers.ts";

const ENHANCED = {
  version: 3,
  hits: 1,
  kgversion: "477",
  data: [{
    score: 0.70,
    esscore: 1840.5,
    entity: { name: "Diffbot", homepageUri: "diffbot.com", nbEmployees: 40 },
    errors: [],
  }],
  errors: [],
};

Deno.test("kg-enhance: GETs /kg/v3/enhance with the partial record and returns the best match", async () => {
  const { ctx, calls } = mockCtx([{ body: ENHANCED }]);
  const out = await run(action, {
    type: "Organization",
    name: "Diffbot",
    url: "diffbot.com",
    filter: "$.name",
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://kg.diffbot.com/kg/v3/enhance");
  assertEquals(calls[0].method, "GET");
  assertEquals(u.searchParams.get("type"), "Organization");
  assertEquals(u.searchParams.get("name"), "Diffbot");
  assertEquals(u.searchParams.get("url"), "diffbot.com");
  assertEquals(u.searchParams.get("filter"), "$.name");
  assertEquals(u.searchParams.has("refresh"), false);
  assertEquals(out.found, true);
  assertEquals(out.score, 0.70);
  assertEquals((out.entity as { name: string }).name, "Diffbot");
});

Deno.test("kg-enhance: no match is found=false with a null entity; refresh/search sent when on", async () => {
  const none = mockCtx([{ body: { version: 3, hits: 0, data: [], errors: [] } }]);
  const out = await run(
    action,
    { type: "Person", name: "Nobody", refresh: true, search: true },
    none.ctx,
  );
  assertEquals(out.found, false);
  assertEquals(out.entity, null);
  const q = new URL(none.calls[0].url).searchParams;
  assertEquals(q.get("refresh"), "true");
  assertEquals(q.get("search"), "true");
});

Deno.test("kg-enhance: a null entity inside data is not a match; 429 insufficient credits throws", async () => {
  const nul = mockCtx([{ body: { hits: 1, data: [{ score: 0.1, entity: null }] } }]);
  assertEquals((await run(action, { type: "Person", name: "x" }, nul.ctx)).found, false);
  const broke = mockCtx([{ status: 429, body: { code: 429, message: "Insufficient credits" } }]);
  await assertRejects(
    () => run(action, { type: "Person", name: "x" }, broke.ctx),
    Error,
    "Insufficient credits",
  );
});
