import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  base64ToBytes,
  bytesToBase64,
  DeepLClient,
  FREE_URL,
  hostForConnection,
  hostForKey,
  isFreeKey,
  PRO_URL,
} from "../../lib/client.ts";

Deno.test("isFreeKey: true only for keys ending in :fx", () => {
  assertEquals(isFreeKey("279a2e9d-83b3-c416-7e2d-f721593e42a0:fx"), true);
  assertEquals(isFreeKey("279a2e9d-83b3-c416-7e2d-f721593e42a0"), false);
  assertEquals(isFreeKey("fx-not-at-the-end:fxy"), false);
});

Deno.test("hostForKey: routes by the :fx suffix", () => {
  assertEquals(hostForKey("abc:fx"), FREE_URL);
  assertEquals(hostForKey("abc"), PRO_URL);
});

Deno.test("hostForConnection: reads the plan label, defaults to Pro when absent", () => {
  assertEquals(hostForConnection({ plan: "free" }), FREE_URL);
  assertEquals(hostForConnection({ plan: "pro" }), PRO_URL);
  assertEquals(hostForConnection(undefined), PRO_URL);
  assertEquals(hostForConnection({}), PRO_URL);
});

Deno.test("DeepLClient: routes to the free host when display.plan is 'free'", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }], { display: { plan: "free" } });
  await new DeepLClient(ctx).request("/v2/usage");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, FREE_URL);
});

Deno.test("DeepLClient: routes to the pro host when display.plan is 'pro'", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }], { display: { plan: "pro" } });
  await new DeepLClient(ctx).request("/v2/usage");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, PRO_URL);
});

Deno.test("DeepLClient: defaults to the pro host with no connection at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new DeepLClient(ctx).request("/v2/usage");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, PRO_URL);
});

Deno.test("DeepLClient: never sets Authorization itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: { plan: "pro" } });
  await new DeepLClient(ctx).request("/v2/usage");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("DeepLClient: throws a descriptive Error carrying the vendor's message field", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "Quota Exceeded" } }]);
  const client = new DeepLClient(ctx);
  const err = await assertRejects(
    () => client.request("/v2/translate"),
    Error,
    "DeepL 429",
  );
  assertEquals(err.message.includes("Quota Exceeded"), true);
});

Deno.test("DeepLClient: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new DeepLClient(ctx);
  await client.request("/v2/translate", {
    method: "POST",
    body: { text: ["hi"], target_lang: "DE" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { text: ["hi"], target_lang: "DE" });
});

Deno.test("DeepLClient: raw:true returns the Response untouched for a 2xx", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "binary-ish", headers: {} }]);
  const client = new DeepLClient(ctx);
  const res = await client.request<Response>("/v2/document/x/result", { raw: true });
  assertEquals(res.status, 200);
});

Deno.test("DeepLClient: raw:true still throws on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, headers: {} }]);
  const client = new DeepLClient(ctx);
  await assertRejects(
    () => client.request("/v2/document/x/result", { raw: true }),
    Error,
    "DeepL 404",
  );
});

Deno.test("base64ToBytes / bytesToBase64: round-trip, and a data: URL is unwrapped", () => {
  const bytes = new Uint8Array([1, 2, 3, 250]);
  const encoded = bytesToBase64(bytes);
  assertEquals(base64ToBytes(encoded), bytes);
  const withPrefix = `data:application/pdf;base64,${encoded}`;
  assertEquals(base64ToBytes(withPrefix), bytes);
});
