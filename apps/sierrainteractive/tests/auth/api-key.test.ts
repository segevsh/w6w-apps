import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const test = apiKey.test!;

Deno.test("api-key: sign stamps the Sierra-User-ApiKey header and nothing else", async () => {
  const req = {
    url: "https://api.sierrainteractivedev.com/zapier/agents",
    method: "GET",
    headers: {},
  };
  const out = await apiKey.sign!(
    { request: req, credential: { apiKey: "k-123" } } as never,
    {} as never,
  );
  assertEquals((out as typeof req).headers, { "sierra-user-apikey": "k-123" });
  assertEquals(authHeaders({}), { "sierra-user-apikey": "" });
});

Deno.test("api-key: shape is an apiKey header method with a secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "Sierra-User-ApiKey" });
  assertEquals(apiKey.fields?.[0].type, "secret");
});

Deno.test("api-key: test passes on a success envelope and sends the key header", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await test({ credential: { apiKey: " k " } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.sierrainteractivedev.com/zapier/validateAPIKey");
  assertEquals(calls[0].headers["sierra-user-apikey"], "k");
});

Deno.test("api-key: test classifies a 400 Unauthorized body as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Unauthorized request") }]);
  const r = await test({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.includes("rejected the API key"), true);
});

Deno.test("api-key: test fails without a key (no request) and on other failures", async () => {
  const none = mockCtx();
  assertEquals((await test({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const odd = mockCtx([{ body: "<html>hi</html>" }]);
  assertEquals((await test({ credential: { apiKey: "k" } } as never, odd.ctx)).ok, false);

  const down = mockCtx([{ status: 503, body: "<html>down</html>" }]);
  const r = await test({ credential: { apiKey: "k" } } as never, down.ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.includes("HTTP 503"), true);
});
