import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  ACCOUNT_MANAGEMENT_URL,
  accountName,
  GoogleBusinessProfileClient,
  locationName,
} from "../../lib/client.ts";

Deno.test("client: joins baseUrl + path and returns parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [{ name: "accounts/1" }] } }]);
  const client = new GoogleBusinessProfileClient(ctx);
  const result = await client.request<{ accounts: unknown[] }>(
    ACCOUNT_MANAGEMENT_URL,
    "/accounts",
  );
  assertEquals(result.accounts.length, 1);
  assertEquals(new URL(calls[0].url).host, "mybusinessaccountmanagement.googleapis.com");
  assertEquals(new URL(calls[0].url).pathname, "/v1/accounts");
});

Deno.test("client: skips undefined/null/empty query params, keeps zeros and false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GoogleBusinessProfileClient(ctx);
  await client.request(ACCOUNT_MANAGEMENT_URL, "/x", {
    query: { a: undefined, b: null, c: "", d: 0, e: false, f: "keep" },
  });
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("a"));
  assert(!params.has("b"));
  assert(!params.has("c"));
  assertEquals(params.get("d"), "0");
  assertEquals(params.get("e"), "false");
  assertEquals(params.get("f"), "keep");
});

Deno.test("client: JSON-encodes bodies and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "accounts/1" } }]);
  const client = new GoogleBusinessProfileClient(ctx);
  await client.request(ACCOUNT_MANAGEMENT_URL, "/accounts/1", {
    method: "PATCH",
    body: { accountName: "New name" },
  });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, `{"accountName":"New name"}`);
});

Deno.test("client: throws with status + detail on non-2xx", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { error: { code: 401, status: "UNAUTHENTICATED" } },
  }]);
  const client = new GoogleBusinessProfileClient(ctx);
  await assertRejects(
    async () => await client.request(ACCOUNT_MANAGEMENT_URL, "/accounts"),
    Error,
    "401",
  );
});

Deno.test("client: returns undefined for 204 No Content", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const client = new GoogleBusinessProfileClient(ctx);
  const result = await client.request<void>(ACCOUNT_MANAGEMENT_URL, "/x", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: returns undefined for a genuinely empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const client = new GoogleBusinessProfileClient(ctx);
  const result = await client.request(ACCOUNT_MANAGEMENT_URL, "/x");
  assertEquals(result, undefined);
});

Deno.test("accountName: forgiving of an already-prefixed id", () => {
  assertEquals(accountName("123"), "accounts/123");
  assertEquals(accountName("accounts/123"), "accounts/123");
});

Deno.test("locationName: forgiving of an already-prefixed id", () => {
  assertEquals(locationName("456"), "locations/456");
  assertEquals(locationName("locations/456"), "locations/456");
});
