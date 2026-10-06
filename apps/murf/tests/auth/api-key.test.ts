import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const both = { apiKey: "speech-secret-1", dubApiKey: "dub-secret-2" };
const req = (url: string) => ({ url, method: "GET", headers: {} as Record<string, string> });
const sign = (url: string, credential: unknown) =>
  auth.sign!({ request: req(url), credential } as never, {} as never) as ReturnType<typeof req>;

Deno.test("api-key: sign uses the speech key on speech endpoints and the dub key on /v1/murfdub/", () => {
  assertEquals(
    sign("https://api.murf.ai/v1/speech/generate", both).headers["api-key"],
    "speech-secret-1",
  );
  const dub = sign("https://api.murf.ai/v1/murfdub/jobs/create", both);
  assertEquals(dub.headers["api-key"], "dub-secret-2");
  assertEquals(Object.keys(dub.headers), ["api-key"]);
});

Deno.test("api-key: sign refuses when the needed key is missing, without echoing the other", () => {
  let msg = "";
  try {
    sign("https://api.murf.ai/v1/murfdub/projects/list", { apiKey: "speech-secret-1" });
  } catch (e) {
    msg = String(e);
  }
  assert(msg.includes("Murf Dub"));
  assert(!msg.includes("speech-secret-1"));
  let msg2 = "";
  try {
    sign("https://api.murf.ai/v1/speech/voices", { dubApiKey: "d" });
  } catch (e) {
    msg2 = String(e);
  }
  assert(msg2.includes("Speech"));
});

Deno.test("api-key: test probes each supplied key on its own endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, {
    body: [{ locale: "en_US", language: "English" }],
  }]);
  assertEquals((await auth.test!({ credential: both } as never, ctx)).ok, true);
  assertEquals(calls.map((c) => c.url), [
    "https://api.murf.ai/v1/speech/voices",
    "https://api.murf.ai/v1/murfdub/list-source-languages",
  ]);
  assertEquals(calls[0].headers["api-key"], "speech-secret-1");
  assertEquals(calls[1].headers["api-key"], "dub-secret-2");
});

Deno.test("api-key: a single key is enough, and only that key is probed", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } } as never, ctx)).ok, true);
  assertEquals(calls.length, 1);
});

Deno.test("api-key: a 403 envelope fails by error_code and never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error_message: "Invalid 'api-key' header passed", error_code: 403 },
  }]);
  const r = await auth.test!({ credential: both } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Speech"));
  assert(r.message?.includes("Invalid 'api-key'"));
  assert(!JSON.stringify(r).includes("speech-secret-1"));
});

Deno.test("api-key: a 200 with an error_code body (not the list shape) fails; a bad dub key names Murf Dub", async () => {
  const a = mockCtx([{ body: { error_message: "nope", error_code: 401 } }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } } as never, a.ctx)).ok, false);
  const b = mockCtx([
    { body: [] },
    { status: 403, body: { error_message: "Invalid 'api-key' header passed", error_code: 403 } },
  ]);
  const r = await auth.test!({ credential: both } as never, b.ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Murf Dub"));
});

Deno.test("api-key: 429, an HTML 200, no key, and an unreachable host all fail", async () => {
  const a = await auth.test!(
    { credential: { apiKey: "k" } } as never,
    mockCtx([{ status: 429, body: "slow" }]).ctx,
  );
  assert(a.message?.includes("rate limited"));
  const b = await auth.test!(
    { credential: { apiKey: "k" } } as never,
    mockCtx([{ body: "<html>" }]).ctx,
  );
  assertEquals(b.ok, false);
  assertEquals((await auth.test!({ credential: {} } as never, mockCtx().ctx)).ok, false);
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} };
  const c = await auth.test!({ credential: { apiKey: "k" } } as never, ctx as never);
  assert(c.message?.includes("boom"));
});
