import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** `Api-Key`, not `Authorization`, and no scheme word. */
Deno.test("api-key: signs with the Api-Key header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.pinecone.io/indexes",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "pcsk_abc" } }, ctx);
  assertEquals(out.headers["api-key"], "pcsk_abc");
  assertEquals(Object.keys(out.headers), ["api-key"]);
});

Deno.test("api-key: test reports what the key can see", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { indexes: [{ name: "a" }, { name: "b" }] },
  }]);
  const out = await auth.test!({ credential: { apiKey: "pcsk_abc" } }, ctx);
  assertEquals(out.ok, true);
  assert(out.message!.includes("2 indexes"), out.message);
  assertEquals(calls[0].headers["x-pinecone-api-version"], "2026-04");
});

/** A key from the wrong project connects fine and sees nothing. */
Deno.test("api-key: an empty project connects, and says so plainly", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { indexes: [] } }]);
  const out = await auth.test!({ credential: { apiKey: "pcsk_abc" } }, ctx);
  assertEquals(out.ok, true);
  assert(/no indexes/.test(out.message!), out.message);
});

/** Both auth failures are PLAIN TEXT, not JSON. */
Deno.test("api-key: a missing header is distinguished from a bad key", async () => {
  const missing = mockCtx([{
    status: 401,
    body: "Missing api-key header",
    headers: { "content-type": "text/html" },
  }]);
  const a = await auth.test!({ credential: { apiKey: "x" } }, missing.ctx);
  assertEquals(a.ok, false);
  assert(/never arrived/.test(a.message!), a.message);

  const invalid = mockCtx([{
    status: 401,
    body: "Invalid API key",
    headers: { "content-type": "text/html" },
  }]);
  const b = await auth.test!({ credential: { apiKey: "x" } }, invalid.ctx);
  assertEquals(b.ok, false);
  assert(/rejected the API key/.test(b.message!), b.message);
});

/** An unsupported version answers 403 with the list of supported ones. */
Deno.test("api-key: a version rejection is reported as a version problem", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: "Unsupported API version '2099-01'. Supported versions: 2024-04, …",
  }]);
  const out = await auth.test!({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out.ok, false);
  assert(/API version/.test(out.message!), out.message);
});

Deno.test("api-key: a missing credential never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the regions, never the key", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      indexes: [
        { name: "a", spec: { serverless: { cloud: "aws", region: "us-east-1" } } },
        { name: "b", spec: { serverless: { cloud: "aws", region: "us-east-1" } } },
      ],
    },
  }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "pcsk_abc" } }, ctx) as {
    indexCount: number;
    regions: string[];
    project: string;
  };
  assertEquals(display.indexCount, 2);
  assertEquals(display.regions, ["aws/us-east-1"]);
  assert(!JSON.stringify(display).includes("pcsk_abc"));
});

Deno.test("api-key: the key field is declared secret", () => {
  const f = auth.fields!.find((f) => f.key === "apiKey")!;
  assertEquals(f.type, "secret");
  assertEquals(f.required, true);
});
