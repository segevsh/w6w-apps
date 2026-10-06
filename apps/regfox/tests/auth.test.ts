import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../auth/api-key.ts";
import { envelope, mockCtx, pathOf } from "./_helpers.ts";

const credential = { apiKey: "key_123" };

Deno.test("auth: sign stamps the apiKey header", async () => {
  const req = {
    url: "https://api.webconnex.com/v2/public/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request: req, credential } as never, {} as never);
  assertEquals((out as typeof req).headers["apiKey"], "key_123");
  assertEquals(authHeaders({ apiKey: " k " }).apiKey, "k");
  assertEquals(authHeaders({}).apiKey, "");
});

Deno.test("auth: test passes only on the documented envelope with a data array", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const res = await apiKey.test({ credential } as never, ctx);
  assertEquals(res.ok, true);
  assertEquals(pathOf(calls[0].url), "/v2/public/forms");
  assertEquals(new URL(calls[0].url).search, "?limit=1");
  assertEquals(calls[0].headers["apikey"], "key_123");
  assert(PROBE_PATH.startsWith("/forms"));
});

Deno.test("auth: the public /ping is never the probe", () => {
  assert(!PROBE_PATH.includes("ping"));
});

Deno.test("auth: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await apiKey.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("unexpected response"), res.message);
});

Deno.test("auth: a wrong key (HTTP 404, invalid apiKey) is a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "invalid apiKey" } },
  }]);
  const res = await apiKey.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the API key"), res.message);
  assert(!res.message?.includes("key_123"));
});

Deno.test("auth: a missing key (HTTP 401, code 4401) is a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      responseCode: 401,
      error: { code: 4401, description: "apiKey is missing from request header" },
    },
  }]);
  assertEquals((await apiKey.test({ credential } as never, ctx)).ok, false);
});

Deno.test("auth: an unrelated 404 is unexpected, not a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "GET /forms not found" } },
  }]);
  const res = await apiKey.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("unexpected response"), res.message);
});

Deno.test("auth: a missing key never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiKey.test({ credential: {} } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});
