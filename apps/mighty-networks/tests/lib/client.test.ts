import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_URL,
  compact,
  errorMessage,
  idList,
  listResult,
  MightyClient,
  networkIdFromConnection,
  seg,
} from "../../lib/client.ts";
import { API, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";

Deno.test("client: API_URL is the documented production base", () => {
  assertEquals(API_URL, "https://api.mn.co/admin/v1");
  assertEquals(API, API_URL);
});

Deno.test("client: requests are scoped to /networks/{id} from the connection", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { ok: true } }]);
  await new MightyClient(ctx).request("/members", { query: { page: 2, per_page: "", x: null } });
  assertEquals(calls[0].url, `${API}/networks/${NET}/members?page=2`);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a subdomain Network id is accepted and encoded", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }], "my-network");
  await new MightyClient(ctx).request("/me");
  assertEquals(calls[0].url, `${API}/networks/my-network/me`);
});

Deno.test("client: a JSON body sets content-type", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }]);
  await new MightyClient(ctx).request("/tags", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: empty and 204 responses resolve to undefined", async () => {
  const { ctx } = mockConnectedCtx([{ status: 204 }, { status: 200 }]);
  const c = new MightyClient(ctx);
  assertEquals(await c.request("/a", { method: "DELETE" }), undefined);
  assertEquals(await c.request("/b", { method: "DELETE" }), undefined);
});

Deno.test("client: failures carry status, path and the vendor's own error text", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 422,
    statusText: "Unprocessable",
    body: { error: "invalid", message: "Email taken" },
  }]);
  const err = await assertRejects(() => new MightyClient(ctx).request("/members"));
  assert(String((err as Error).message).includes("422"));
  assert(String((err as Error).message).includes("/networks/12345/members"));
  assert(String((err as Error).message).includes("invalid: Email taken"));
});

Deno.test("client: a missing or malformed Network id is refused before any request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => new MightyClient(ctx), Error, "no Network ID");
  const bad = mockCtx([], { display: { networkId: "../etc" } });
  assertThrows(() => new MightyClient(bad.ctx), Error, "not a numeric id or a subdomain");
  assertEquals(calls.length + bad.calls.length, 0);
  assertThrows(() => networkIdFromConnection(undefined), Error, "no Network ID");
});

Deno.test("client: compact drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("client: idList parses comma-separated ids and rejects junk", () => {
  assertEquals(idList("1, 2,3"), [1, 2, 3]);
  assertEquals(idList(""), undefined);
  assertEquals(idList(undefined), undefined);
  assertThrows(() => idList("1,abc"), Error, "abc");
});

Deno.test("client: errorMessage reads JSON, falls back to truncated text", () => {
  assertEquals(
    errorMessage('{"error":"unauthorized","message":"Invalid API token"}'),
    "unauthorized: Invalid API token",
  );
  assertEquals(
    errorMessage('{"error":"Missing or malformed Authorization header"}'),
    "Missing or malformed Authorization header",
  );
  assertEquals(errorMessage("<html>" + "x".repeat(500)).length, 400);
  assertEquals(errorMessage(""), "");
});

Deno.test("client: listResult lifts items from an array, items or data, else null", () => {
  assertEquals(listResult([1]).items, [1]);
  assertEquals(listResult({ items: [2] }).items, [2]);
  assertEquals(listResult({ data: [3], meta: {} }).items, [3]);
  assertEquals(listResult({ other: 1 }).items, null);
  assertEquals(listResult(undefined), { items: null, result: null });
});

Deno.test("client: seg encodes path segments", () => {
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(seg(5), "5");
});
