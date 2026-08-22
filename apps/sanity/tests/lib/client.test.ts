import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  dataHost,
  describeError,
  draftIdOf,
  isDraftId,
  publishedIdOf,
  SanityClient,
} from "../../lib/client.ts";

const live = { display: { projectId: "abc123", dataset: "production", useCdn: false } };
const cdn = { display: { projectId: "abc123", dataset: "production", useCdn: true } };

/** The project is part of the hostname, not the path. */
Deno.test("dataHost: the project is a subdomain, and the CDN is a different one", () => {
  assertEquals(dataHost("abc123"), "https://abc123.api.sanity.io");
  assertEquals(dataHost("abc123", true), "https://abc123.apicdn.sanity.io");
});

Deno.test("client: reads go to the live host by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], live);
  await new SanityClient(ctx).request("/data/query/production", { query: { query: "*" } });
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
  assert(calls[0].url.includes(`/${API_VERSION}/`), calls[0].url);
});

Deno.test("client: a CDN connection reads through the CDN", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }], cdn);
  await new SanityClient(ctx).request("/data/query/production", { query: { query: "*" } });
  assertEquals(new URL(calls[0].url).host, "abc123.apicdn.sanity.io");
});

/** The CDN rejects any POST that is not a query, so writes must bypass it. */
Deno.test("client: a write forces the live host even on a CDN connection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], cdn);
  await new SanityClient(ctx).request("/data/mutate/production", {
    method: "POST",
    live: true,
    body: { mutations: [] },
  });
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
});

Deno.test("client: the management API is not project-scoped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], live);
  await new SanityClient(ctx).request("/projects", { management: true });
  assertEquals(new URL(calls[0].url).host, "api.sanity.io");
});

Deno.test("client: a connection with no project fails with a fixable message", () => {
  const { ctx } = mockCtx([], { display: { dataset: "production" } });
  assertThrows(() => new SanityClient(ctx), Error, "project id");
});

Deno.test("client: datasetFor prefers an override, then the connection", () => {
  const { ctx } = mockCtx([], live);
  const client = new SanityClient(ctx);
  assertEquals(client.datasetFor("staging"), "staging");
  assertEquals(client.datasetFor(""), "production");

  const { ctx: bare } = mockCtx([], { display: { projectId: "abc123" } });
  assertThrows(() => new SanityClient(bare).datasetFor(), Error, "dataset-list");
});

/** NDJSON: one document per line, not a JSON array. */
Deno.test("client: requestNdjson parses one document per line", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: '{"_id":"a","_type":"article"}\n{"_id":"b","_type":"article"}\n',
    headers: { "content-type": "application/x-ndjson" },
  }], live);
  const rows = await new SanityClient(ctx).requestNdjson("/data/export/production");
  assertEquals(rows.length, 2);
  assertEquals((rows[0] as { _id: string })._id, "a");
});

Deno.test("client: a GROQ syntax error surfaces its description", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: { description: 'unexpected token "]", expected expression', type: "queryParseError" },
    },
  }], live);
  const err = await assertRejects(
    async () => await new SanityClient(ctx).request("/data/query/production"),
  );
  assert(String(err).includes("expected expression"), String(err));
});

Deno.test("describeError: a 429 names the concurrency limits", () => {
  assert(/500 concurrent queries/.test(describeError(429, "{}")), describeError(429, "{}"));
});

/** A draft is a separate document with a prefixed id. */
Deno.test("draft ids: the prefix converts both ways and is idempotent", () => {
  assertEquals(draftIdOf("article-1"), "drafts.article-1");
  assertEquals(draftIdOf("drafts.article-1"), "drafts.article-1");
  assertEquals(publishedIdOf("drafts.article-1"), "article-1");
  assertEquals(publishedIdOf("article-1"), "article-1");
  assertEquals(isDraftId("drafts.article-1"), true);
  assertEquals(isDraftId("article-1"), false);
});
