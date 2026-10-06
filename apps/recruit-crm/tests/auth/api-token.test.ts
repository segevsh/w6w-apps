import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "rcrm_unitTestFixtureNotARealToken0000";

Deno.test("api-token: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.recruitcrm.io/v1/candidates",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.recruitcrm.io/v1/candidates");
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is /users and the method is a bearer token", () => {
  assertEquals(PROBE_PATH, "/users");
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.key, "api-token");
});

Deno.test("api-token: test passes when /users answers its JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, first_name: "A" }] }]);
  assertEquals(await apiToken.test({ credential: { apiToken: TOKEN } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiToken.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: classifies from the body's error text, whatever the status", async () => {
  const cases: Array<[number, unknown, string]> = [
    [401, { message: "credential could not be resolved" }, "rejected the token"],
    [403, { error: "Unauthorized" }, "rejected the token"],
    [403, { error: "token_not_active_error" }, "not active"],
    [401, { errorMessage: "Please activate your token" }, "not active"],
  ];
  for (const [status, body, expected] of cases) {
    const { ctx } = mockCtx([{ status, body }]);
    const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(expected), `${JSON.stringify(body)}: ${result.message}`);
  }
});

Deno.test("api-token: a 200 carrying an error string is still a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "Unauthorized" } }]);
  assertEquals((await apiToken.test({ credential: { apiToken: TOKEN } }, ctx)).ok, false);
});

Deno.test("api-token: a 200 HTML shell is not a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html></html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("without its JSON envelope"));
});

Deno.test("api-token: the failure message never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "bad" } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assert(!result.message!.includes(TOKEN));
});
