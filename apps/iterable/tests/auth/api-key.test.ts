import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: fields are apiKey (secret) and region (select, defaults us, two hosts)", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields?.map((f) => f.key), ["apiKey", "region"]);
  assertEquals(auth.fields?.[0].type, "secret");
  const region = auth.fields?.[1];
  assertEquals(region?.default, "us");
  assertEquals((region?.options as Array<{ value: string }>).map((o) => o.value), ["us", "eu"]);
});

Deno.test("api-key: sign stamps the Api-Key header", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!(
    {
      request: { url: "https://api.iterable.com/api/channels", method: "GET", headers: {} },
      credential: { apiKey: "k1" },
    },
    ctx,
  );
  assertEquals(out.headers["api-key"], "k1");
});

Deno.test("api-key: test without a key fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test GETs /channels on the US host and passes on the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { channels: [{ id: 1 }] } }]);
  assertEquals(await auth.test({ credential: { apiKey: "k1" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.iterable.com/api/channels");
  assertEquals(calls[0].headers["api-key"], "k1");
});

Deno.test("api-key: test uses the EU host for region eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { channels: [] } }]);
  await auth.test({ credential: { apiKey: "k", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/channels");
});

Deno.test("api-key: a vendor Unauthorized code is a rejection, whatever the status", async () => {
  for (const status of [401, 403, 200]) {
    const { ctx } = mockCtx([{ status, body: { code: "Unauthorized", msg: "Invalid API key" } }]);
    const r = await auth.test({ credential: { apiKey: "bad" } }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message?.includes("rejected"), true);
  }
});

Deno.test("api-key: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
});

Deno.test("api-key: other vendor error codes surface verbatim", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { code: "RateLimitExceeded", msg: "slow" } }]);
  const r = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message, "Iterable 429: RateLimitExceeded slow");
});

Deno.test("api-key: afterConnect records the region", async () => {
  const { ctx } = mockCtx();
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k", region: "eu" } } as never, ctx),
    { region: "eu" },
  );
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {
    region: "us",
  });
});
