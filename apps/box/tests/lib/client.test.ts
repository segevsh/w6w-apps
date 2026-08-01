import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BoxClient } from "../../lib/client.ts";

Deno.test("client: defaults to GET and prepends API_URL for relative paths", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new BoxClient(ctx);
  await client.request("/files/123");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.box.com/2.0/files/123");
});

Deno.test("client: passes absolute URLs through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  const client = new BoxClient(ctx);
  await client.request("https://upload.box.com/api/2.0/files/content", {
    method: "POST",
    rawBody: "raw-body",
    headers: { "content-type": "multipart/form-data; boundary=x" },
  });
  assertEquals(calls[0].url, "https://upload.box.com/api/2.0/files/content");
  assertEquals(calls[0].headers["content-type"], "multipart/form-data; boundary=x");
  assertEquals(calls[0].body, "raw-body");
});

Deno.test("client: JSON-encodes `body` and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const client = new BoxClient(ctx);
  await client.request("/folders", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("client: omits undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  const client = new BoxClient(ctx);
  await client.request("/search", { query: { query: "invoice", type: undefined, scope: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "invoice");
  assertEquals(url.searchParams.has("type"), false);
  assertEquals(url.searchParams.has("scope"), false);
});

Deno.test("client: returns undefined for a 204 response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new BoxClient(ctx);
  const result = await client.request("/files/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"code":"not_found"}' },
  ]);
  const client = new BoxClient(ctx);
  await assertRejects(
    () => client.request("/files/999"),
    Error,
    "Box 404",
  );
});
