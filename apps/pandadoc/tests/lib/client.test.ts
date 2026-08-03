import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_BASE, API_HOST, compact, PandaDocClient } from "../../lib/client.ts";

Deno.test("client: targets api.pandadoc.com/public/v1", () => {
  assertEquals(API_HOST, "api.pandadoc.com");
  assertEquals(API_BASE, "https://api.pandadoc.com/public/v1");
});

Deno.test("client: builds the URL, sets accept, and parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "a" }] } }]);
  const out = await new PandaDocClient(ctx).request("/documents", { query: { count: 10 } });

  assertEquals(calls[0].url, "https://api.pandadoc.com/public/v1/documents?count=10");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(out, { results: [{ id: "a" }] });
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PandaDocClient(ctx).request("/members/current");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: drops undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PandaDocClient(ctx).request("/documents", {
    query: { q: "", status: undefined, tag: null, page: 2, deleted: false },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), null);
  assertEquals(q.get("status"), null);
  assertEquals(q.get("tag"), null);
  assertEquals(q.get("page"), "2");
  // `false` is a meaningful value, not an omission.
  assertEquals(q.get("deleted"), "false");
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1" } }]);
  await new PandaDocClient(ctx).request("/documents", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"x"}');
});

Deno.test("client: 204 No Content resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new PandaDocClient(ctx).request("/documents/d1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: surfaces PandaDoc's type + detail error envelope", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "authentication_error", detail: "Invalid key." } },
  ]);
  const err = await assertRejects(
    () => new PandaDocClient(ctx).request("/members/current"),
    Error,
  );
  assertEquals(
    err.message,
    "PandaDoc 401 for GET /public/v1/members/current: authentication_error: Invalid key.",
  );
});

Deno.test("client: flattens a nested validation detail instead of [object Object]", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: { type: "validation_error", detail: { recipients: ["This field is required."] } },
    },
  ]);
  const err = await assertRejects(() => new PandaDocClient(ctx).request("/documents"), Error);
  assertEquals(
    err.message.includes('{"recipients":["This field is required."]}'),
    true,
    err.message,
  );
});

Deno.test("client: falls back to the raw text on a non-JSON error body", async () => {
  const { ctx } = mockCtx([
    { status: 502, body: "<html>bad gateway</html>", headers: { "content-type": "text/html" } },
  ]);
  const err = await assertRejects(() => new PandaDocClient(ctx).request("/documents"), Error);
  assertEquals(err.message.includes("bad gateway"), true, err.message);
});

Deno.test("client: raw returns the Response untouched", async () => {
  const { ctx } = mockCtx([
    { body: "%PDF-1.4", headers: { "content-type": "application/pdf" } },
  ]);
  const res = await new PandaDocClient(ctx).request<Response>("/documents/d1/download", {
    raw: true,
  });
  assertEquals(res.headers.get("content-type"), "application/pdf");
  assertEquals(await res.text(), "%PDF-1.4");
});

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});
