import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-keys.ts";

const cred = { apiKey: "AK", secretKey: "SK", region: "US" };
const sign = (url: string, headers: Record<string, string> = {}, body?: string) =>
  auth.sign!({
    request: { url, method: "POST", headers, body },
    credential: cred,
  } as never, mockCtx([]).ctx) as { url: string; headers: Record<string, string>; body?: string };

/** Site 1: the query hosts want both keys as HTTP Basic. */
Deno.test("api-keys: query hosts get Basic auth of both keys", () => {
  for (const host of ["https://amplitude.com", "https://analytics.eu.amplitude.com"]) {
    const signed = sign(`${host}/api/2/events/list`);
    assertEquals(signed.headers["authorization"], `Basic ${btoa("AK:SK")}`);
  }
});

/** Site 2: JSON ingest wants the key as a field inside the body. */
Deno.test("api-keys: JSON ingest gets the key in the body, not a header", () => {
  const signed = sign(
    "https://api2.amplitude.com/2/httpapi",
    { "content-type": "application/json" },
    JSON.stringify({ events: [{ event_type: "a" }] }),
  );
  assertEquals(signed.headers["authorization"], undefined);
  const body = JSON.parse(signed.body!);
  assertEquals(body.api_key, "AK");
  assertEquals(body.events.length, 1, "the caller's body survives");
});

/** Site 3: the form-encoded endpoints want it as a form parameter. */
Deno.test("api-keys: form ingest gets the key as a form parameter", () => {
  const signed = sign(
    "https://api2.amplitude.com/identify",
    { "content-type": "application/x-www-form-urlencoded" },
    "identification=%5B%5D",
  );
  const form = new URLSearchParams(signed.body!);
  assertEquals(form.get("api_key"), "AK");
  assertEquals(form.get("identification"), "[]");
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-keys: the EU ingest host is treated as ingest, not query", () => {
  const signed = sign(
    "https://api.eu.amplitude.com/batch",
    { "content-type": "application/json" },
    "{}",
  );
  assertEquals(signed.headers["authorization"], undefined);
  assertEquals(JSON.parse(signed.body!).api_key, "AK");
});

/** A body that is not JSON is left alone rather than corrupted. */
Deno.test("api-keys: an unparseable JSON body is left as it was", () => {
  const signed = sign("https://api2.amplitude.com/2/httpapi", {
    "content-type": "application/json",
  }, "not json");
  assertEquals(signed.body, "not json");
});

Deno.test("api-keys: the test proves both keys on the query side", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ value: "Signup" }] } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://amplitude.com/api/2/events/list");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("AK:SK")}`);
  assertEquals(result.ok, true);
  assert(/1 event types/.test(result.message!), result.message);
});

/**
 * The API key alone is a valid credential that cannot query, and Amplitude's
 * message does not distinguish that from a wrong key.
 */
Deno.test("api-keys: a missing secret key is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { apiKey: "AK" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/cannot query anything/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-keys: a 403 explains the two-key rule and suggests the other region", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { http_code: 403, metadata: { details: "Invalid API Key" } } },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/secret key/.test(result.message!), result.message);
  assert(/try the EU region/.test(result.message!), result.message);
});

Deno.test("api-keys: an EU connection tests the EU host and suggests US", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: {} }]);
  const result = await auth.test!({
    credential: { ...cred, region: "EU" },
  } as never, ctx);
  assert(calls[0].url.startsWith("https://analytics.eu.amplitude.com/"), calls[0].url);
  assert(/try the US region/.test(result.message!), result.message);
});

Deno.test("api-keys: a missing api key or an unreachable host fails cleanly", async () => {
  const noKey = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, noKey.ctx)).ok, false);
  assertEquals(noKey.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

Deno.test("api-keys: afterConnect records the region", () => {
  assertEquals(
    auth.afterConnect!({ credential: { region: "eu" } }, mockCtx([]).ctx),
    { region: "EU" },
  );
});

/** The two keys do different jobs, and the hints have to carry that. */
Deno.test("api-keys: the hints explain what each key is for", () => {
  const api = auth.fields!.find((f) => f.key === "apiKey")!;
  const secret = auth.fields!.find((f) => f.key === "secretKey")!;
  assert(/only send events/.test(api.hint!), api.hint);
  assert(/what reads/.test(secret.hint!), secret.hint);
  assertEquals(api.type, "secret");
  assertEquals(secret.type, "secret");
});
