import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, classifyKeyAnswer, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const KEY = "0123456789abcdef0123456789abcdef01234567";
const OK = { project_uuid: "p1", project_name: "Production", message: "Authentication successful" };

Deno.test("api-key: sign stamps a Bearer header and nothing else", () => {
  const req = {
    url: "https://api.refiner.io/v1/forms",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!(
    { request: req, credential: { apiKey: KEY } } as never,
    mockCtx().ctx,
  ) as typeof req;
  assertEquals(out.headers, { authorization: `Bearer ${KEY}` });
  assertEquals(out.url, req.url);
});

Deno.test("api-key: declares one secret field and the bearer type", () => {
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("api-key: test passes on the documented success shape and sends the Bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  assertEquals(await apiKey.test!({ credential: { apiKey: KEY } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.refiner.io/v1/");
  assertEquals(PROBE_PATH, "/");
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails without calling out when the key is blank", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiKey.test!({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test classifies the three refusals by BODY, including the 404", async () => {
  const cases: Array<[number, unknown, RegExp]> = [
    [401, { error: "No API key found in headers" }, /no usable key/],
    [401, { error: "API key does not look valid" }, /does not look valid/],
    [404, { message: "API key not valid or does not exist" }, /does not recognise/],
  ];
  for (const [status, body, re] of cases) {
    const { ctx } = mockCtx([{ status, body }]);
    const res = await apiKey.test!({ credential: { apiKey: KEY } } as never, ctx);
    assertEquals(res.ok, false);
    assert(re.test(res.message!), res.message);
  }
});

Deno.test("api-key: a 404 with no recognised body is not read as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "<html>nope</html>" }]);
  const res = await apiKey.test!({ credential: { apiKey: KEY } } as never, ctx);
  assertEquals(res.ok, false);
  assert(/HTTP 404/.test(res.message!), res.message);
});

Deno.test("api-key: test reports a 429 as rate-limited", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: "You are doing this too often." } }]);
  const res = await apiKey.test!({ credential: { apiKey: KEY } } as never, ctx);
  assert(/rate-limited/.test(res.message!), res.message);
});

Deno.test("api-key: classifyKeyAnswer needs project_uuid for acceptance, not just a 200", () => {
  assertEquals(classifyKeyAnswer(200, JSON.stringify(OK)).kind, "accepted");
  assertEquals(classifyKeyAnswer(200, "<html>shell</html>").kind, "other");
  assertEquals(classifyKeyAnswer(200, "{}").kind, "other");
});

Deno.test("api-key: afterConnect labels the connection with the environment name", async () => {
  const { ctx } = mockCtx([{ body: OK }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } } as never, ctx), {
    projectName: "Production",
    projectUuid: "p1",
  });
});

Deno.test("api-key: afterConnect swallows failures and returns no metadata", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "No API key found in headers" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } } as never, ctx), {});
  const boom = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } } as never, boom), {});
});
