import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { modeOf } from "../../auth/api-key.ts";

const user = (modes: string[]) => ({
  status: 200,
  body: { id: "user_1", name: "Acme", api_keys: modes.map((mode) => ({ mode })) },
});

/** The key is the username and the password is EMPTY — a trailing colon. */
Deno.test("api-key: sign sends Basic auth with an empty password", () => {
  const request = { url: "https://api.easypost.com/v2/users", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { apiKey: "EZTK1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(atob(signed.headers["authorization"].slice(6)), "EZTK1:");
});

/**
 * The failure this reporting exists for: a test key succeeds at everything and
 * buys nothing, and no response says which kind made it.
 */
Deno.test("api-key: test names the environment in plain words", async () => {
  const prod = mockCtx([user(["production"])]);
  const prodResult = await auth.test!({ credential: { apiKey: "EZAK1" } }, prod.ctx);
  assertEquals(prod.calls[0].url, "https://api.easypost.com/v2/users");
  assertEquals(prodResult.ok, true);
  assert(/PRODUCTION/.test(prodResult.message!), prodResult.message);
  assert(/real postage/.test(prodResult.message!), prodResult.message);

  const test = mockCtx([user(["test"])]);
  const testResult = await auth.test!({ credential: { apiKey: "EZTK1" } }, test.ctx);
  assertEquals(testResult.ok, true);
  assert(/TEST key/.test(testResult.message!), testResult.message);
  assert(/buy nothing/.test(testResult.message!), testResult.message);
});

/** Guessing the mode would be worse than not knowing. */
Deno.test("api-key: an ambiguous account is reported as unstated, not guessed", async () => {
  const { ctx } = mockCtx([user(["test", "production"])]);
  const result = await auth.test!({ credential: { apiKey: "EZ1" } }, ctx);
  assertEquals(result.ok, true);
  assert(/did not state/.test(result.message!), result.message);
});

Deno.test("modeOf: reports a single mode and refuses to guess otherwise", () => {
  assertEquals(modeOf([{ mode: "test" }, { mode: "test" }], "k"), "test");
  assertEquals(modeOf([{ mode: "test" }, { mode: "production" }], "k"), "unknown");
  assertEquals(modeOf([], "k"), "unknown");
  assertEquals(modeOf(undefined, "k"), "unknown");
});

/** A wrong key is a typo; a deactivated one is a dashboard visit. */
Deno.test("api-key: a deactivated key is distinguished from a wrong one", async () => {
  const dead = mockCtx([{
    status: 403,
    body: { error: { code: "APIKEY.INACTIVE", message: "This api key is no longer active." } },
  }]);
  const deadResult = await auth.test!({ credential: { apiKey: "EZ1" } }, dead.ctx);
  assertEquals(deadResult.ok, false);
  assert(/deactivated/.test(deadResult.message!), deadResult.message);

  const wrong = mockCtx([{ status: 401, body: { error: { message: "Unauthorized" } } }]);
  const wrongResult = await auth.test!({ credential: { apiKey: "EZ1" } }, wrong.ctx);
  assertEquals(wrongResult.ok, false);
  assert(/rejected this API key/.test(wrongResult.message!), wrongResult.message);
});

Deno.test("api-key: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "EZ1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The mode is public metadata; the key never is. */
Deno.test("api-key: afterConnect records the mode and account, not the key", async () => {
  const { ctx } = mockCtx([user(["production"])]);
  const display = await auth.afterConnect!({ credential: { apiKey: "EZAK_secret" } }, ctx);
  assertEquals(display, { mode: "production", account: "Acme" });
  assert(!JSON.stringify(display).includes("EZAK_secret"));
});

Deno.test("api-key: afterConnect degrades quietly when the account cannot be read", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "EZ1" } }, ctx), {});
});

Deno.test("api-key: is basic auth with one secret field", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});
