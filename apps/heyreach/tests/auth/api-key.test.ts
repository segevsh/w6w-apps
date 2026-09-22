import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { authHeaders, classifyAuthAnswer, PROBE_PATH } from "../../auth/api-key.ts";

const cred = { apiKey: "HEYREACH-KEY-123" };

const sign = (url: string, headers: Record<string, string> = {}) =>
  auth.sign!({
    request: { url, method: "GET", headers },
    credential: cred,
  } as never, mockCtx([]).ctx) as { url: string; headers: Record<string, string> };

/** The header name is HeyReach's own, verbatim — no bearer prefix, no Authorization. */
Deno.test("api-key: signs with a single X-API-KEY header", () => {
  const signed = sign("https://api.heyreach.io/api/public/campaign/GetAll");
  assertEquals(signed.headers["X-API-KEY"], "HEYREACH-KEY-123");
  assertEquals(authHeaders(cred), { "X-API-KEY": "HEYREACH-KEY-123" });
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-API-KEY");
  // No Authorization header anywhere: this API has no bearer form.
  assertEquals(Object.keys(signed.headers).some((h) => /authorization/i.test(h)), false);
});

/** Both refusals are 401; the body text is the only discriminator. */
Deno.test("classifyAuthAnswer: the two 401s are told apart by their text", () => {
  assertEquals(classifyAuthAnswer(401, "Missing API key"), "key-missing");
  assertEquals(classifyAuthAnswer(401, "Invalid API key"), "key-rejected");
  assertEquals(classifyAuthAnswer(200, ""), "accepted");
  assertEquals(classifyAuthAnswer(429, ""), "rate-limited");
  assertEquals(classifyAuthAnswer(500, "boom"), "unexpected");
  assertEquals(classifyAuthAnswer(401, "nope"), "unexpected");
});

Deno.test("api-key: a 200 is a live credential, and the probe sends the header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, `https://api.heyreach.io/api/public${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-api-key"], "HEYREACH-KEY-123");
  assertEquals(result.ok, true);
  assert(/accepted the API key/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected key is reported as a credential problem, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/vendor is reachable/.test(result.message!), result.message);
  assert(/Settings > API/.test(result.message!), result.message);
});

Deno.test("api-key: `Missing API key` reads as a wiring problem, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Missing API key" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/no key reached the request/.test(result.message!), result.message);
});

/** The document claims a JSON error body here; the live wire answer is plain text. */
Deno.test("api-key: a JSON 401 body is not required to classify the answer", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorMessage: "Invalid API key" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/Invalid API key/.test(result.message!), result.message);
});

Deno.test("api-key: a 429 is throttling, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/throttled/.test(result.message!), result.message);
});

/** A 200 is the documented answer, and the document declares no body at all. */
Deno.test("api-key: a 200 with a non-JSON body is still a live credential", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, true);
});

/** A proxy or a shell answering for the API is not an answer about the key. */
Deno.test("api-key: a 502 is reported as something other than the API", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>Bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/something other than the API answered/.test(result.message!), result.message);
});

Deno.test("api-key: a missing key is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(/missing apiKey/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: an unreachable host fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

/** A probe's result is stored and displayed; it must not carry the key back. */
Deno.test("api-key: the probe never echoes the credential", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(!JSON.stringify(result).includes("HEYREACH-KEY-123"), JSON.stringify(result));
});

Deno.test("api-key: the field is a secret", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
  assert(/Settings > API/.test(field.hint!), field.hint);
});
