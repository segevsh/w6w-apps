import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import accessToken, { PROBE_PATH } from "../../auth/access-token.ts";
import { AUTH_HEADER } from "../../lib/client.ts";
import { mockCtx, pathOf, v3Error } from "../_helpers.ts";

const CREDENTIAL = { storeHash: "abc123", accessToken: "tok-live-123" };

Deno.test("auth: sign stamps X-Auth-Token, never Authorization", () => {
  const request: SignableRequest = {
    method: "GET",
    url: "https://api.bigcommerce.com/stores/abc123/v3/catalog/products",
    headers: {},
  };
  const signed = accessToken.sign!(
    { request, credential: CREDENTIAL },
    mockCtx().ctx,
  ) as SignableRequest;

  assertEquals(signed.headers[AUTH_HEADER], "tok-live-123");
  // BigCommerce does not use the Authorization header for this API, and the
  // deprecated X-Auth-Client is never sent.
  assertEquals(signed.headers["authorization"], undefined);
  assertEquals(signed.headers["x-auth-client"], undefined);
  // The token never reaches the URL: BigCommerce has no query-parameter form.
  assert(!signed.url.includes("tok-live-123"));
});

Deno.test("auth: the probe is /v2/time — cheap, authenticated, and free of PII", async () => {
  const { ctx, calls } = mockCtx([{ body: { time: 1786000000 } }]);
  assertEquals(await accessToken.test({ credential: CREDENTIAL }, ctx), { ok: true });

  assertEquals(pathOf(calls[0].url), `/stores/abc123/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers[AUTH_HEADER], "tok-live-123");
  // NOT /v2/store, which returns admin_email, order_email and the owner's name.
  assert(!calls[0].url.includes("/v2/store"), calls[0].url);
});

Deno.test("auth: test never echoes the credential back in its message", async () => {
  const cases: Array<[number, unknown]> = [
    [401, "X-Auth-Token header is required"],
    [401, v3Error(401, "Unauthorized")],
    [403, v3Error(403, "Forbidden")],
    [500, "boom"],
  ];
  for (const [status, body] of cases) {
    const { ctx } = mockCtx([{ status, body }]);
    const result = await accessToken.test({ credential: CREDENTIAL }, ctx) as {
      ok: boolean;
      message?: string;
    };
    assertEquals(result.ok, false);
    assert(result.message, `status ${status} produced no message`);
    assert(!result.message!.includes("tok-live-123"), `status ${status} echoed the token`);
  }
});

Deno.test("auth: a missing header and a rejected token are told apart by the BODY", async () => {
  // Both are 401. Classifying by status would merge two different fixes.
  const missing = mockCtx([{ status: 401, body: "X-Auth-Token header is required" }]);
  const rejected = mockCtx([{ status: 401, body: v3Error(401, "Unauthorized") }]);

  const a = await accessToken.test({ credential: CREDENTIAL }, missing.ctx) as { message: string };
  const b = await accessToken.test({ credential: CREDENTIAL }, rejected.ctx) as { message: string };

  assert(a.message.includes("received no X-Auth-Token header"), a.message);
  assert(b.message.includes("rejected the access token"), b.message);
  assert(a.message !== b.message, "two different causes produced the same message");
});

Deno.test("auth: an empty X-Auth-Token gets its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "X-Auth-Token header should have correct format",
  }]);
  const result = await accessToken.test({ credential: CREDENTIAL }, ctx) as { message: string };
  assert(result.message.includes("empty or malformed"), result.message);
});

Deno.test("auth: a 403 reports BOTH documented causes, because nothing distinguishes them", async () => {
  const { ctx } = mockCtx([{ status: 403, body: v3Error(403, "Forbidden") }]);
  const result = await accessToken.test({ credential: CREDENTIAL }, ctx) as { message: string };
  assert(result.message.includes("store hash is wrong"), result.message);
  assert(result.message.includes("Information & Settings"), result.message);
});

Deno.test("auth: 429 and 503 say the token could not be VERIFIED, not that it is bad", async () => {
  for (const status of [429, 503]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const result = await accessToken.test({ credential: CREDENTIAL }, ctx) as { message: string };
    assert(result.message.startsWith("Could not verify"), `${status}: ${result.message}`);
    assert(result.message.includes("says nothing about the token"), result.message);
  }
});

Deno.test("auth: a missing or malformed field fails before any request is made", async () => {
  // `mockCtx([])` throws on any fetch, so reaching the network fails the test.
  assertEquals(
    await accessToken.test({ credential: { accessToken: "x" } }, mockCtx([]).ctx),
    { ok: false, message: "credential missing storeHash" },
  );
  assertEquals(
    await accessToken.test({ credential: { storeHash: "abc123" } }, mockCtx([]).ctx),
    { ok: false, message: "credential missing accessToken" },
  );
  const bad = await accessToken.test(
    { credential: { storeHash: "abc 123", accessToken: "x" } },
    mockCtx([]).ctx,
  ) as { message: string };
  assert(bad.message.includes("not a bare hash"), bad.message);
});

Deno.test("auth: test accepts the API path a merchant pastes from the control panel", async () => {
  const { ctx, calls } = mockCtx([{ body: { time: 1 } }]);
  const result = await accessToken.test({
    credential: {
      storeHash: "https://api.bigcommerce.com/stores/abc123/v3/",
      accessToken: "tok-live-123",
    },
  }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/time");
});

Deno.test("auth: afterConnect publishes the store hash and name — and nothing sensitive", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "abc123",
      name: "Acme Supplies",
      domain: "acme.example.com",
      admin_email: "owner@example.com",
      order_email: "orders@example.com",
      first_name: "Jane",
      last_name: "Doe",
      account_uuid: "11111111-2222-3333-4444-555555555555",
      plan_name: "Pro",
    },
  }]);
  const display = await accessToken.afterConnect!({ credential: CREDENTIAL }, ctx);

  assertEquals(display, {
    storeHash: "abc123",
    storeName: "Acme Supplies",
    storeDomain: "acme.example.com",
  });
  // The endpoint is chatty; what is KEPT is what matters.
  const serialized = JSON.stringify(display);
  for (const leaked of ["owner@example.com", "orders@example.com", "Jane", "Doe", "5555"]) {
    assert(!serialized.includes(leaked), `afterConnect published ${leaked}`);
  }
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/store");
});

Deno.test("auth: afterConnect still records the store hash when the scope is refused", async () => {
  // A token scoped away from Information & Settings is a GOOD token, and the
  // store hash is the part the client actually needs.
  const { ctx } = mockCtx([{ status: 403, body: v3Error(403, "Forbidden") }]);
  assertEquals(await accessToken.afterConnect!({ credential: CREDENTIAL }, ctx), {
    storeHash: "abc123",
  });
});

Deno.test("auth: connectionLabel renders from the display fields afterConnect sets", () => {
  assertEquals(accessToken.connectionLabel, "{{storeName}} ({{storeHash}})");
});
