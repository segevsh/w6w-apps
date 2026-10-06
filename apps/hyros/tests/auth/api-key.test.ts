import { assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sign: stamps the API-Key header and nothing else", async () => {
  const req = {
    url: "https://api.hyros.com/v1/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!(
    { request: req, credential: { apiKey: " k1 " } } as never,
    undefined as never,
  );
  assertEquals((out as typeof req).headers, { "api-key": "k1" });
});

Deno.test("test: ok on 200, probing /stages with the key header", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.hyros.com/v1/api/v1.0/stages?pageSize=1");
  assertEquals(calls[0].headers["api-key"], "k");
});

Deno.test("test: wrong key (JSON body) vs missing key (text/plain) vs 400 variant", async () => {
  for (
    const r of [
      { status: 401, body: { result: "ERROR", message: ["Api key not valid"] } },
      { status: 400, body: { result: "ERROR", message: ["Api key not valid"] } },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    const out = await apiKey.test({ credential: { apiKey: "bad" } } as never, ctx);
    assertEquals(out.ok, false);
    assertEquals(/rejected the API key/.test(out.message ?? ""), true);
  }
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized", contentType: "text/plain" }]);
  const out = await apiKey.test({ credential: { apiKey: "x" } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(/did not reach the request/.test(out.message ?? ""), true);
});

Deno.test("test: empty credential fails without a request; 429 and 500 are reported", async () => {
  const none = mockCtx([]);
  assertEquals((await apiKey.test({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
  const rl = mockCtx([{ status: 429, body: "slow", contentType: "text/plain" }]);
  assertEquals(
    /rate limit/.test(
      (await apiKey.test({ credential: { apiKey: "k" } } as never, rl.ctx)).message ?? "",
    ),
    true,
  );
  const e = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    /answered 500/.test(
      (await apiKey.test({ credential: { apiKey: "k" } } as never, e.ctx)).message ?? "",
    ),
    true,
  );
});
