import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey0000";
const NOT_FOUND = { errorcode: 1, message: "The API key was not found" };
const BAD_TOKEN = { message: "Invalid token: access token is invalid" };

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.cloze.com/v1/people/find",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is the stage list, not the profile", () => {
  assertEquals(PROBE_PATH, "/v1/user/stages/people");
});

Deno.test("api-key: test passes on a stage list body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { errorcode: 0, list: [{ name: "Lead", key: "lead" }] },
  }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: a 200 that is not the stage list is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("unexpected body"));
});

Deno.test("api-key: test fails with no key and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "  " } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejection is recognised from the body, in both of Cloze's shapes", async () => {
  for (const body of [NOT_FOUND, BAD_TOKEN]) {
    const { ctx } = mockCtx([{ status: 401, body }]);
    const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);
    assertEquals(result.ok, false);
    assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  }
});

Deno.test("api-key: an unrelated error is reported verbatim and never as a rejection", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errorcode: 404, message: "Resource Not Found" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Resource Not Found"));
  assert(!/rejected/i.test(result.message ?? ""));
});
