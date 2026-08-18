import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

const credential = {
  cloudName: "acme",
  apiKey: "123456789",
  apiSecret: "s3cret",
  region: "us",
};

Deno.test("basic: signs with HTTP Basic over key:secret", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.cloudinary.com/v1_1/acme/ping",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("123456789:s3cret")}`);
});

Deno.test("basic: test pings the cloud on the region's host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).host, "api.cloudinary.com");
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/ping");
});

Deno.test("basic: the EU and AP regions use their own hosts", async () => {
  for (const [region, host] of [["eu", "api-eu.cloudinary.com"], ["ap", "api-ap.cloudinary.com"]]) {
    const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
    await auth.test!({ credential: { ...credential, region } }, ctx);
    assertEquals(new URL(calls[0].url).host, host);
  }
});

/** The symptom points at the key; the fix is often the region dropdown. */
Deno.test("basic: an unknown api_key blames the key AND the region", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { message: "unknown api_key" } },
    headers: { "content-type": "application/json", "x-cld-error": "unknown api_key" },
  }]);
  const out = await auth.test!({ credential: { ...credential, region: "eu" } }, ctx);
  assertEquals(out.ok, false);
  assert(/EU/.test(out.message!), out.message);
  assert(/region/.test(out.message!), out.message);
});

Deno.test("basic: a missing cloud name is caught before the network", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test!({ credential: { apiKey: "1", apiSecret: "2" } }, ctx);
  assertEquals(out.ok, false);
  assert(/cloudName/.test(out.message!), out.message);
  assertEquals(calls.length, 0);
});

Deno.test("basic: afterConnect records the cloud and region, never the secret", () => {
  const display = auth.afterConnect!({ credential }, mockCtx().ctx) as Record<string, unknown>;
  assertEquals(display, { cloudName: "acme", region: "us" });
  assert(!JSON.stringify(display).includes("s3cret"));
});

Deno.test("basic: an unknown region is normalised to us", () => {
  const display = auth.afterConnect!(
    { credential: { ...credential, region: "mars" } },
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display.region, "us");
});

Deno.test("basic: both credential fields are declared secret", () => {
  for (const key of ["apiKey", "apiSecret"]) {
    const f = auth.fields!.find((f) => f.key === key)!;
    assertEquals(f.type, "secret", key);
  }
});
