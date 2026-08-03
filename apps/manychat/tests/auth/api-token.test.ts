import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiToken from "../../auth/api-token.ts";

const PAGE = {
  status: "success",
  data: {
    id: 1234567890,
    name: "Acme Shop",
    username: "acmeshop",
    timezone: "UTC+02:00",
    is_pro: true,
  },
};

// ------------------------------------------------------------------------ sign

Deno.test("api-token: sign puts the token in an Authorization: Bearer header", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://api.manychat.com/fb/page/getInfo",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!(
    { request, credential: { token: "123456:abc" } } as never,
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer 123456:abc");
});

Deno.test("api-token: sign never rewrites the URL — the credential stays in the header", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://api.manychat.com/fb/page/getInfo",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!(
    { request, credential: { token: "123456:abc" } } as never,
    ctx,
  ) as typeof request;
  assertEquals(signed.url, "https://api.manychat.com/fb/page/getInfo");
  assert(!signed.url.includes("123456"));
});

// ------------------------------------------------------------------------ test

Deno.test("api-token: test probes getInfo, the one endpoint that needs no prior knowledge", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const result = await apiToken.test!({ credential: { token: "t" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getInfo");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("api-token: test fails fast on a missing token without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test reports the vendor's 401 message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "error", message: "Wrong token" } }]);
  const result = await apiToken.test!({ credential: { token: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Wrong token"), result.message);
});

Deno.test("api-token: test treats a 200 with `status: error` as a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "error", message: "Token is required" },
  }]);
  const result = await apiToken.test!({ credential: { token: "x" } } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-token: test never echoes the token in its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "error", message: "Wrong token" } }]);
  const result = await apiToken.test!({ credential: { token: "s3cr3t-value" } } as never, ctx);
  assert(!result.message?.includes("s3cr3t-value"), result.message);
});

// ---------------------------------------------------------------- afterConnect

Deno.test("afterConnect: lifts page identity onto the connection display", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const display = await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx);
  assertEquals(display, {
    pageId: "1234567890",
    pageName: "Acme Shop",
    pageUsername: "acmeshop",
    timezone: "UTC+02:00",
    isPro: true,
  });
});

Deno.test("afterConnect: page id is carried as a string — Meta ids exceed 2^53", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", data: { id: 1234567890, name: "P" } } }]);
  const display = await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx) as {
    pageId: unknown;
  };
  assertEquals(typeof display.pageId, "string");
});

Deno.test("afterConnect: returns nothing rather than throwing when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { status: "error", message: "boom" } }]);
  assertEquals(await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx), {});
});

Deno.test("afterConnect: returns nothing on a 200 whose envelope says error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "error", message: "nope" } }]);
  assertEquals(await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx), {});
});

Deno.test("afterConnect: display carries no credential material", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const display = await apiToken.afterConnect!({ credential: { token: "s3cr3t" } } as never, ctx);
  assert(!JSON.stringify(display).includes("s3cr3t"));
});

// ---------------------------------------------------------------- declaration

Deno.test("api-token: the connection label names the Page", () => {
  assertEquals(apiToken.connectionLabel, "{{pageName}}");
});
