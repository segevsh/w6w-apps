import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-query.ts";

const hits = (points: unknown[]) => ok({ points });

/**
 * Qdrant defaults `with_payload` to FALSE on query and returns ids and scores
 * alone — a workflow reading a field off the result gets undefined.
 */
Deno.test("point-query: asks for payloads, against Qdrant's own default", async () => {
  const { ctx, calls } = mockCtx([hits([{ id: 1, score: 0.9 }])], { display });
  await action.execute!({ collection: "docs", vector: "[0.1,0.2]" }, ctx);
  assertEquals(
    calls[0].url,
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/query",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.with_payload, true);
  assertEquals(body.with_vector, false);
  assertEquals(body.query, [0.1, 0.2]);
});

/** The current API has only `query` — `points/search` is gone from the spec. */
Deno.test("point-query: calls points/query, not the retired points/search", async () => {
  const { ctx, calls } = mockCtx([hits([])], { display });
  await action.execute!({ collection: "docs", vector: "[0.1]" }, ctx);
  assert(calls[0].url.endsWith("/points/query"), calls[0].url);
  assert(!calls[0].url.includes("/points/search"), calls[0].url);
});

/** Scoping a search to one tenant is a data-leak question, not a perf one. */
Deno.test("point-query: the filter reaches the wire unchanged", async () => {
  const { ctx, calls } = mockCtx([hits([])], { display });
  await action.execute!({
    collection: "docs",
    vector: "[0.1]",
    filter: '{"must":[{"key":"tenant","match":{"value":"acme"}}]}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).filter, {
    must: [{ key: "tenant", match: { value: "acme" } }],
  });
});

Deno.test("point-query: returns the best score for a relevance gate", async () => {
  const { ctx } = mockCtx([hits([{ id: 1, score: 0.92 }, { id: 2, score: 0.71 }])], { display });
  const result = await action.execute!({ collection: "docs", vector: "[0.1]" }, ctx) as {
    count: number;
    topScore: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.topScore, 0.92);
});

Deno.test("point-query: a zero threshold is omitted rather than sent", async () => {
  const { ctx, calls } = mockCtx([hits([])], { display });
  await action.execute!({ collection: "docs", vector: "[0.1]", scoreThreshold: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).score_threshold, undefined);
});

Deno.test("point-query: a real threshold is sent", async () => {
  const { ctx, calls } = mockCtx([hits([])], { display });
  await action.execute!({ collection: "docs", vector: "[0.1]", scoreThreshold: 0.8 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).score_threshold, 0.8);
});

/** The payloads are the data. */
Deno.test("point-query: logs a count, never the results", async () => {
  const { ctx, logs } = mockCtx([hits([{ id: 1, score: 0.9, payload: { secret: "tuna" } }])], {
    display,
  });
  await action.execute!({ collection: "docs", vector: "[0.1]" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { collection: "docs", count: 1 });
});

Deno.test("point-query: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

Deno.test("point-query: is a search action and warns about the payload default", () => {
  assertEquals(action.type, "search");
  assert(/ids and scores\s+ONLY by default/.test(action.description!), action.description);
});
