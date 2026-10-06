import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

const biz = okEnvelope({ business: { id: 12345, businessName: "Loft Hotels", package: "Pro" } });

Deno.test("api-key: declares the key query parameter and one secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "query", name: "key" });
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
});

Deno.test("api-key: sign sets the key query parameter and keeps the rest of the URL", async () => {
  const request = {
    url: "https://api.vbout.com/1/emailmarketing/getlist.json?id=5",
    method: "GET",
    headers: {},
  };
  const out = await apiKey.sign!(
    { request, credential: { apiKey: " k-123 " } } as never,
    {} as never,
  );
  assertEquals(queryOf(out.url), { id: "5", key: "k-123" });
  assertEquals(Object.keys(out.headers), []);
});

Deno.test("api-key: test passes on an ok envelope carrying business details", async () => {
  const { ctx, calls } = mockCtx([{ body: biz }]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k" } } as never, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/1/app/me.json");
  assertEquals(queryOf(calls[0].url), { key: "k" });
});

Deno.test("api-key: test fails without a key and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiKey.test({ credential: {} } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reads the verdict from the body, whatever the status", async () => {
  // A rejected key is an error envelope, on a 401 or even a 200.
  for (const status of [401, 400, 200]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "nope") }]);
    const res = await apiKey.test({ credential: { apiKey: "bad" } } as never, ctx);
    assertEquals(res.ok, false);
    assert(res.message?.includes("nope"));
  }
});

Deno.test("api-key: test rejects a 200 that is not the envelope, and an ok with no business", async () => {
  const html = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await apiKey.test({ credential: { apiKey: "k" } } as never, html.ctx)).ok, false);
  const empty = mockCtx([{ body: okEnvelope({}) }]);
  assertEquals((await apiKey.test({ credential: { apiKey: "k" } } as never, empty.ctx)).ok, false);
});

Deno.test("api-key: a 429 is reported as rate limiting, not as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorEnvelope(1100, "slow down") }]);
  const res = await apiKey.test({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rate-limited"));
});

Deno.test("api-key: afterConnect labels the connection with the business name", async () => {
  const { ctx } = mockCtx([{ body: biz }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {
    business: { businessName: "Loft Hotels" },
  });
  const bad = mockCtx([{ status: 401, body: errorEnvelope(1000, "x") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, bad.ctx), {});
});
