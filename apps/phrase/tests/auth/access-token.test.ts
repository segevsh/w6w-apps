import { assert, assertEquals } from "@std/assert";
import accessToken, { authHeaders, PROBE_PATH } from "../../auth/access-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealToken0000000000000000";
const USER = { id: "u1", username: "ada", name: "Ada", email: "ada@example.com" };

Deno.test("access-token: sign sends `Authorization: token <t>` and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.phrase.com/v2/projects",
    headers: {} as Record<string, string>,
  };
  const signed = accessToken.sign!(
    { request, credential: { accessToken: TOKEN } },
    {} as never,
  ) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `token ${TOKEN}`);
  assert(!signed.url.includes(TOKEN), "the token must never be in a URL");
});

Deno.test("access-token: authHeaders is the single wire format", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), { authorization: `token ${TOKEN}` });
});

Deno.test("access-token: the probe is GET /user, which echoes no credential", async () => {
  assertEquals(PROBE_PATH, "/user");
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.phrase.com/v2/user");
  assertEquals(calls[0].headers.authorization, `token ${TOKEN}`);
});

Deno.test("access-token: test targets the US host for a US credential", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await accessToken.test({ credential: { accessToken: TOKEN, region: "us" } }, ctx);
  assertEquals(calls[0].url, "https://api.us.app.phrase.com/v2/user");
});

Deno.test("access-token: a missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await accessToken.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: a 401 with Phrase's empty body is a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  const r = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(/rejected the token/.test(r.message ?? ""), r.message);
  assert(!(r.message ?? "").includes(TOKEN));
});

Deno.test("access-token: a 200 that is not a user object is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(/not the documented|not with a user/.test(r.message ?? ""), r.message);
});

Deno.test("access-token: 403, 429 and 5xx are told apart", async () => {
  for (const [status, re] of [[403, /scope/], [429, /rate-limited/], [503, /HTTP 503/]] as const) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const r = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
    assertEquals(r.ok, false);
    assert(re.test(r.message ?? ""), `${status}: ${r.message}`);
  }
});

Deno.test("access-token: afterConnect publishes region and username, nothing else", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const out = await accessToken.afterConnect!(
    { credential: { accessToken: TOKEN, region: "US" } },
    ctx,
  );
  assertEquals(out, { region: "us", username: "ada" });
  assertEquals(pathOf(calls[0].url), "/v2/user");
});

Deno.test("access-token: afterConnect still publishes the region when the lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await accessToken.afterConnect!({ credential: { accessToken: TOKEN } }, ctx),
    { region: "eu" },
  );
});
