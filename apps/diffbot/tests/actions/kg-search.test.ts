import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/kg-search.ts";
import { mockCtx, run } from "../_helpers.ts";
import { DQL_RESPONSE } from "../_fixtures.ts";

Deno.test("kg-search: POSTs the DQL query as JSON to kg.diffbot.com and unwraps entities", async () => {
  const { ctx, calls } = mockCtx([{ body: DQL_RESPONSE }]);
  const out = await run(action, {
    query: 'type:Organization locations.city.name:"San Francisco"',
    size: 2,
    filter: "$.name;$.nbEmployees",
  }, ctx);
  assertEquals(calls[0].url, "https://kg.diffbot.com/kg/v3/dql");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query: 'type:Organization locations.city.name:"San Francisco"',
    size: 2,
    filter: "$.name;$.nbEmployees",
  });
  assertEquals(out.hits, 642);
  assertEquals(out.count, 2);
  assertEquals(out.kgVersion, "477");
  assertEquals(out.diffbotType, "Organization");
  assertEquals(out.entities, [
    { name: "Yandex", nbEmployees: 26361 },
    { name: "Google", nbEmployees: 187000 },
  ]);
});

Deno.test("kg-search: an empty result is zero hits, not an error; a parse error throws with the message", async () => {
  const none = mockCtx([{ body: { version: 3, hits: 0, results: 0, data: [] } }]);
  const out = await run(action, { query: "type:Organization name:zzz" }, none.ctx);
  assertEquals(out.hits, 0);
  assertEquals(out.entities, []);

  const bad = mockCtx([{
    status: 400,
    body: { error: true, message: 'Encountered ":" at line 1', line: 1 },
  }]);
  await assertRejects(() => run(action, { query: "type::x" }, bad.ctx), Error, "Encountered");
});

Deno.test("kg-search: optional flags are sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: DQL_RESPONSE }]);
  await run(action, { query: "q", from: 5, jsonmode: "extended", nonCanonicalFacts: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.from, 5);
  assertEquals(body.jsonmode, "extended");
  assertEquals(body.nonCanonicalFacts, true);
  assertEquals("size" in body, false);
});
