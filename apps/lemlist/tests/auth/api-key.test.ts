import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";

const cred = { apiKey: "abcdef123456" };
const expected = `Basic ${encodeBase64(`:${cred.apiKey}`)}`;

/**
 * These are the tests that matter most in this app.
 *
 * lemlist is HTTP Basic with an **empty username** and the key as the
 * **password** — `base64(":key")`. Close (`apps/close`) is the mirror image:
 * key as username, empty password — `base64("key:")`. Both produce a
 * syntactically valid `Authorization: Basic ...` header, so swapping them throws
 * nowhere and simply 401s forever against the live API. The colon's POSITION is
 * therefore pinned from several directions below.
 */

Deno.test("api-key: the encoded payload is `:key` — EMPTY username, key as password", () => {
  const encoded = basicHeader(cred.apiKey).slice("Basic ".length);
  const decoded = atob(encoded);

  assertEquals(decoded, ":abcdef123456");
  // The colon must be FIRST: everything before it is the username, and lemlist
  // requires that to be empty.
  assertEquals(decoded.indexOf(":"), 0);
  assertEquals(decoded.split(":")[0], "", "username must be empty");
  assertEquals(decoded.split(":")[1], cred.apiKey, "password must be the API key");
});

Deno.test("api-key: matches lemlist's documented recipe — base64 of `:YourApiKey`", () => {
  // lemlist: "Create string with format `:YourApiKey`" → base64 → `Basic {result}`.
  assertEquals(basicHeader("YourApiKey"), `Basic ${encodeBase64(":YourApiKey")}`);
  assertEquals(basicHeader("YourApiKey"), "Basic OllvdXJBcGlLZXk=");
  assertEquals(atob("OllvdXJBcGlLZXk="), ":YourApiKey");
});

Deno.test("api-key: the Close-shaped `base64('key:')` is a DIFFERENT, wrong header", () => {
  // Guards the single most likely silent failure in this app: building the
  // header the way the sibling Close app does.
  const closeShaped = `Basic ${encodeBase64(`${cred.apiKey}:`)}`;
  assert(
    basicHeader(cred.apiKey) !== closeShaped,
    "lemlist must NOT use Close's key-as-username form",
  );
  // And prove the wrong one really is the trailing-colon form, so this test
  // cannot pass for the wrong reason.
  assertEquals(atob(closeShaped.slice("Basic ".length)), "abcdef123456:");
});

Deno.test("api-key: bare base64 of the key, with no colon at all, is also wrong", () => {
  assert(basicHeader(cred.apiKey) !== `Basic ${encodeBase64(cred.apiKey)}`);
});

Deno.test("api-key: encodes keys with non-ASCII bytes as UTF-8, not code units", () => {
  // btoa() throws on code points > 255, so the encoder must go through
  // TextEncoder. A key is ASCII in practice; this pins the implementation
  // anyway so a future edit cannot regress into raw btoa().
  assertEquals(basicHeader("clé"), `Basic ${encodeBase64(":clé")}`);
});

Deno.test("api-key: declares one secret field and the basic wire type", () => {
  assertEquals(auth.key, "api-key");
  // Basic is genuinely what goes over the wire, even though the credential is an
  // API key — `ApiKeyConfig` cannot express base64(`:key`).
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  // No username field: lemlist fixes it empty, so prompting for one would only
  // invite a wrong answer.
  assertEquals(fields.length, 1);
});

Deno.test("api-key: sign stamps the Basic header and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], expected);
});

Deno.test("api-key: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /team?version=v2 with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "tea_1", name: "lemlist" } }]);
  const result = await auth.test({ credential: cred }, ctx);

  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/team");
  assertEquals(url.searchParams.get("version"), "v2");
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("api-key: test fails without a network call when the key is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces lemlist's text/plain auth errors verbatim", async () => {
  // lemlist answers auth failures with text/plain, not JSON — these exact
  // sentences are the documented bodies.
  const cases: Array<[number, string]> = [
    [400, "No API key provided"],
    [401, "The authentication you supplied is incorrect"],
    [403, "User linked to this API key is blocked"],
    [404, "No user found for this API key"],
  ];
  for (const [status, message] of cases) {
    const { ctx } = mockCtx([{ status, body: message, headers: { "content-type": "text/plain" } }]);
    const result = await auth.test({ credential: cred }, ctx);
    assertEquals(result.ok, false, `${status} should fail`);
    assertEquals(result.message, message);
  }
});

Deno.test("api-key: test falls back to the status when the body is HTML or oversized", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("502"));

  const { ctx: ctx2 } = mockCtx([{ status: 500, body: "x".repeat(500) }]);
  const result2 = await auth.test({ credential: cred }, ctx2);
  assertEquals(result2.ok, false);
  assert((result2.message ?? "").includes("500"));
});

Deno.test("afterConnect: publishes team display data, never the key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      _id: "tea_8QvkOiBfPdb2ZRhHi",
      name: "lemlist",
      userIds: ["usr_1", "usr_2"],
      users: [
        { userId: "usr_1", name: "Ada", email: "ada@example.com", role: "admin" },
        { userId: "usr_2", name: "Grace", email: "grace@example.com", role: "member" },
      ],
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).searchParams.get("version"), "v2");
  const team = display.team as Record<string, unknown>;
  assertEquals(team.id, "tea_8QvkOiBfPdb2ZRhHi");
  assertEquals(team.name, "lemlist");
  assertEquals(team.memberCount, 2);
  // Nothing about the credential may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes(cred.apiKey), false);
  // Nor should members' names and emails be copied onto the Connection.
  assertEquals(JSON.stringify(display).includes("ada@example.com"), false);
});

Deno.test("afterConnect: falls back to userIds for the member count without v2 users", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { _id: "tea_1", name: "lemlist", userIds: ["usr_1", "usr_2", "usr_3"] },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals((display.team as Record<string, unknown>).memberCount, 3);
});

Deno.test("afterConnect: degrades to empty display data rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

Deno.test("api-key: connectionLabel references only data afterConnect publishes", () => {
  assertEquals(auth.connectionLabel, "{{team.name}}");
});
