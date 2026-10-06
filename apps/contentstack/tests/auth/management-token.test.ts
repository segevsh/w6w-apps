import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/management-token.ts";

const CRED = { apiKey: "blt1", managementToken: "cs-tok" };

Deno.test("management-token: fields are two secrets and a seven-way region select", () => {
  assertEquals(auth.key, "management-token");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields?.map((f) => f.key), ["apiKey", "managementToken", "region"]);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[1].type, "secret");
  const region = auth.fields?.[2];
  assertEquals(region?.default, "na");
  assertEquals((region?.options as Array<{ value: string }>).map((o) => o.value), [
    "na",
    "eu",
    "au",
    "azure-na",
    "azure-eu",
    "gcp-na",
    "gcp-eu",
  ]);
});

Deno.test("management-token: sign stamps api_key and authorization", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!(
    {
      request: { url: "https://api.contentstack.io/v3/stacks", method: "GET", headers: {} },
      credential: CRED,
    },
    ctx,
  );
  assertEquals(out.headers["api_key"], "blt1");
  assertEquals(out.headers["authorization"], "cs-tok");
});

Deno.test("management-token: test without key or token fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test({ credential: { managementToken: "t" } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("management-token: test lists content types on the NA host and passes on the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { content_types: [] } }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/content_types?limit=1");
  assertEquals(calls[0].headers["api_key"], "blt1");
  assertEquals(calls[0].headers["authorization"], "cs-tok");
});

Deno.test("management-token: test uses the region's host", async () => {
  const { ctx, calls } = mockCtx([{ body: { content_types: [] } }]);
  await auth.test({ credential: { ...CRED, region: "gcp-eu" } }, ctx);
  assertEquals(calls[0].url, "https://gcp-eu-api.contentstack.com/v3/content_types?limit=1");
});

Deno.test("management-token: vendor codes 109 and 105 are a rejection, whatever the status", async () => {
  for (const [status, code] of [[412, 109], [401, 105], [200, 109]]) {
    const { ctx } = mockCtx([{
      status,
      body: { error_message: "We can't find that Stack.", error_code: code },
    }]);
    const r = await auth.test({ credential: CRED }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message?.includes("rejected"), true);
  }
});

Deno.test("management-token: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await auth.test({ credential: CRED }, ctx)).ok, false);
});

Deno.test("management-token: other vendor error codes surface verbatim", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error_message: "Too many", error_code: 429 } }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message, "Contentstack 429: Too many (code 429)");
});

Deno.test("management-token: afterConnect echoes a known region, defaults the rest to na", async () => {
  assertEquals(await auth.afterConnect!({ credential: { ...CRED, region: "au" } }, mockCtx().ctx), {
    region: "au",
  });
  assertEquals(
    await auth.afterConnect!({ credential: { ...CRED, region: "mars" } }, mockCtx().ctx),
    {
      region: "na",
    },
  );
});
