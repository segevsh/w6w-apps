import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/rest-token.ts";

const restUrl = "https://usw1-example-12345.upstash.io";

Deno.test("sign: stamps Authorization: Bearer <restToken>", () => {
  const request = { url: "x", method: "GET", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { restUrl, restToken: "tok_123" } },
    {} as never,
  );
  assertEquals((signed as typeof request).headers["authorization"], "Bearer tok_123");
});

Deno.test("test: PONG -> ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "PONG" } }]);
  const result = await auth.test({ credential: { restUrl, restToken: "tok_123" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `${restUrl}/ping`);
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
});

Deno.test("test: non-PONG result -> not ok", async () => {
  const { ctx } = mockCtx([{ body: { result: "something-else" } }]);
  const result = await auth.test({ credential: { restUrl, restToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: HTTP failure -> not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "WRONGPASS invalid password" } }]);
  const result = await auth.test({ credential: { restUrl, restToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: missing fields -> not ok, no request made", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: { restUrl } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: echoes restUrl onto the connection display", async () => {
  const result = await auth.afterConnect!(
    { credential: { restUrl, restToken: "tok" } },
    {} as never,
  );
  assertEquals(result, { restUrl });
});
