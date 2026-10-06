import { assert, assertEquals } from "@std/assert";
import auth, { classifyProbe } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "fbk_secret" };

Deno.test("api-key: sign stamps x-api-key and touches nothing else", () => {
  const request = {
    url: "https://app.formbricks.com/api/v1/management/surveys",
    method: "GET",
    headers: {},
  };
  const out = auth.sign!({ request, credential: cred }, mockCtx().ctx) as typeof request;
  assertEquals(out.headers, { "x-api-key": "fbk_secret" });
  assertEquals(out.url, request.url);
});

Deno.test("api-key: declares one required secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields!.length, 1);
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("api-key: test passes on a 200 object and probes GET /management/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", type: "production" } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, true);
  assertEquals(calls[0].url, "https://app.formbricks.com/api/v1/management/me");
  assertEquals(calls[0].headers["x-api-key"], "fbk_secret");
});

Deno.test("api-key: test rejects not_authenticated by its body code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "not_authenticated", message: "Not authenticated", details: {} },
  }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not_authenticated"));
});

Deno.test("api-key: test treats an `unauthorized` 401 as a live key without access", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "unauthorized", message: "no" } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, true);
});

Deno.test("api-key: test fails when the key is missing without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test!({ credential: { apiKey: "  " } }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a network failure as not ok", async () => {
  const { ctx } = mockCtx([]); // empty queue: the mock fetch throws
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("could not reach"));
});

Deno.test("classifyProbe: status table", () => {
  assertEquals(classifyProbe(200, "nope").ok, false);
  assertEquals(classifyProbe(200, {}).ok, true);
  assertEquals(classifyProbe(403, { code: "forbidden" }).ok, true);
  assert(classifyProbe(429, null).message!.includes("429"));
  assert(classifyProbe(500, null).message!.includes("500"));
  assert(classifyProbe(404, null).message!.includes("404"));
});
