import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-export.ts";

const conn = { display: { projectId: "abc123", dataset: "production", useCdn: true } };

/** NDJSON, and always from the live host. */
Deno.test("document-export: parses NDJSON from the live host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: '{"_id":"a","_type":"article"}\n{"_id":"drafts.a","_type":"article"}',
    headers: { "content-type": "application/x-ndjson" },
  }], conn);
  const out = await action.execute!({}, ctx) as { count: number };
  assertEquals(out.count, 2);
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/data/export/production");
});

/** The export includes drafts, which surprises anything treating it as content. */
Deno.test("document-export: drafts can be filtered out after the fact", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: '{"_id":"a"}\n{"_id":"drafts.a"}',
    headers: { "content-type": "application/x-ndjson" },
  }], conn);
  const out = await action.execute!({ excludeDrafts: true }, ctx) as {
    documents: Array<{ _id: string }>;
    count: number;
  };
  assertEquals(out.count, 1);
  assertEquals(out.documents[0]._id, "a");
});

Deno.test("document-export: a type filter reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], conn);
  await action.execute!({ types: "article, author" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("types"), "article,author");
});

Deno.test("document-export: says it includes drafts", () => {
  assert(/drafts included/i.test(action.description!), action.description);
});
