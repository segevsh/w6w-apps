import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-query.ts";

const conn = { display: { projectId: "abc123", dataset: "production", useCdn: false } };

Deno.test("document-query: sends the GROQ query to the dataset's query route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [{ _id: "a" }], ms: 3 } }], conn);
  const out = await action.execute!(
    { query: '*[_type == "article"]', publishedOnly: false },
    ctx,
  ) as { result: unknown[] };
  assertEquals(out.result, [{ _id: "a" }]);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2025-02-19/data/query/production");
  assertEquals(url.searchParams.get("query"), '*[_type == "article"]');
});

/** Parameters go on the wire as `$name=<json>`, not interpolated. */
Deno.test("document-query: parameters are sent as $-prefixed JSON arguments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], conn);
  await action.execute!({
    query: "*[_type == $type && views > $min]",
    params: '{"type":"article","min":5}',
    publishedOnly: false,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$type"), '"article"');
  assertEquals(q.get("$min"), "5");
});

/**
 * A draft is a separate document, so an unfiltered query returns each edited
 * document twice.
 */
Deno.test("document-query: the published-only guard is spliced into the filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], conn);
  const out = await action.execute!({ query: '*[_type == "article"]' }, ctx) as { query: string };
  assertEquals(out.query, '*[_type == "article" && !(_id in path("drafts.**"))]');
  assertEquals(
    new URL(calls[0].url).searchParams.get("query"),
    '*[_type == "article" && !(_id in path("drafts.**"))]',
  );
});

Deno.test("document-query: the guard survives a projection and a slice", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: [] } }], conn);
  const out = await action.execute!(
    { query: '*[_type == "article"]{title}[0...10]' },
    ctx,
  ) as { query: string };
  assertEquals(out.query, '*[_type == "article" && !(_id in path("drafts.**"))]{title}[0...10]');
});

Deno.test("document-query: turning the guard off leaves the query alone", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: [] } }], conn);
  const out = await action.execute!(
    { query: "*[_type == $t]", publishedOnly: false },
    ctx,
  ) as { query: string };
  assertEquals(out.query, "*[_type == $t]");
});

Deno.test("document-query: an empty query is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ query: "  " }, ctx), Error, "query");
  assertEquals(calls.length, 0);
});

Deno.test("document-query: a dataset override wins over the connection's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], conn);
  await action.execute!({ query: "*", dataset: "staging", publishedOnly: false }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/data/query/staging");
});

/** The hint has to explain the double-result, since almost nobody expects it. */
Deno.test("document-query: says why drafts are filtered", () => {
  assert(/twice/.test(action.description!), action.description);
});
