import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  compact,
  csv,
  json,
  PineconeClient,
  vector,
  withScheme,
} from "../../lib/client.ts";

/**
 * The header is not optional: measured 2026-08-18, omitting it makes Pinecone
 * serve 2024-04 — the OLDEST version — rather than the latest.
 */
Deno.test("client: pins the API version header on every request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { indexes: [] } }]);
  await new PineconeClient(ctx).request("/indexes");
  assertEquals(calls[0].headers["x-pinecone-api-version"], API_VERSION);
  assertEquals(API_VERSION, "2026-04");
});

Deno.test("client: control-plane calls go to api.pinecone.io", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new PineconeClient(ctx).request("/indexes");
  assertEquals(new URL(calls[0].url).host, "api.pinecone.io");
});

/** The data plane lives on a host only the control plane knows. */
Deno.test("client: a data call describes the index once, then reuses the host", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } },
    { status: 200, body: { upsertedCount: 1 } },
    { status: 200, body: { upsertedCount: 1 } },
  ]);
  const client = new PineconeClient(ctx);
  await client.data("idx", undefined, "/vectors/upsert", { method: "POST", body: {} });
  await client.data("idx", undefined, "/vectors/upsert", { method: "POST", body: {} });

  assertEquals(calls.length, 3, "the describe call should happen once, not twice");
  assertEquals(new URL(calls[0].url).pathname, "/indexes/idx");
  assertEquals(new URL(calls[1].url).host, "idx-abc.svc.aped-1.pinecone.io");
  assertEquals(new URL(calls[2].url).host, "idx-abc.svc.aped-1.pinecone.io");
});

Deno.test("client: an explicit host skips the describe call entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new PineconeClient(ctx).data(
    "idx",
    "idx-abc.svc.aped-1.pinecone.io",
    "/vectors/upsert",
    { method: "POST", body: {} },
  );
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).host, "idx-abc.svc.aped-1.pinecone.io");
});

Deno.test("client: an index with no host yet says so, rather than building a bad URL", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { name: "idx", status: { state: "Initializing" } },
  }]);
  await assertRejects(
    async () => await new PineconeClient(ctx).hostFor("idx"),
    Error,
    "still be creating",
  );
});

/**
 * Auth failures are PLAIN TEXT with content-type text/html; everything else is
 * a JSON envelope. A client that assumes JSON reports a parse error.
 */
Deno.test("client: a plain-text auth failure surfaces its text, not a parse error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Invalid API key",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(async () => await new PineconeClient(ctx).request("/indexes"));
  assert(String(err).includes("Invalid API key"), String(err));
});

Deno.test("client: a JSON error surfaces the code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      error: { code: "FORBIDDEN", message: "Unsupported API version '2099-01'." },
      status: 403,
    },
  }]);
  const err = await assertRejects(async () => await new PineconeClient(ctx).request("/indexes"));
  assert(String(err).includes("FORBIDDEN"), String(err));
  assert(String(err).includes("Unsupported API version"), String(err));
});

/** The upsert-text route declares application/x-ndjson and nothing else. */
Deno.test("client: NDJSON bodies are one JSON object per line, not an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new PineconeClient(ctx).request("/records/namespaces/ns/upsert", {
    method: "POST",
    body: [{ _id: "a" }, { _id: "b" }],
    contentType: "application/x-ndjson",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-ndjson");
  assertEquals(calls[0].body, '{"_id":"a"}\n{"_id":"b"}');
});

Deno.test("client: repeated query params (ids) are appended, not overwritten", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new PineconeClient(ctx).request("/vectors/fetch", { query: { ids: ["a", "b"] } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("ids"), ["a", "b"]);
});

Deno.test("withScheme: adds https once and only once", () => {
  assertEquals(withScheme("x.pinecone.io"), "https://x.pinecone.io");
  assertEquals(withScheme("https://x.pinecone.io"), "https://x.pinecone.io");
  assertEquals(withScheme("https://x.pinecone.io/"), "https://x.pinecone.io");
});

Deno.test("vector: accepts JSON, live arrays and comma-separated numbers", () => {
  assertEquals(vector("[0.1, 0.2]", "v"), [0.1, 0.2]);
  assertEquals(vector([0.1, 0.2], "v"), [0.1, 0.2]);
  assertEquals(vector("0.1, 0.2", "v"), [0.1, 0.2]);
  assertEquals(vector("", "v"), undefined);
  assertThrows(() => vector('[1, "cat"]', "values"), Error, "values");
});

Deno.test("csv / compact / json behave as the actions assume", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(compact({ a: 1, b: "", c: null, d: [], e: "x" }), { a: 1, e: "x" });
  assertThrows(() => json("{oops", "filter"), Error, "filter");
});
