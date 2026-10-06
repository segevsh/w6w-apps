import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders } from "../auth/api-token.ts";
import { mockCtx } from "./_helpers.ts";

const credential = { apiToken: "  secret-token  " };
const test = (responses: Parameters<typeof mockCtx>[0], cred: unknown = credential) => {
  const m = mockCtx(responses);
  return { ...m, run: () => apiToken.test!({ credential: cred } as never, m.ctx) };
};

Deno.test("auth: is an apiKey scheme named Authorization with the raw token", () => {
  assertEquals(apiToken.type, "apiKey");
  assertEquals(apiToken.apiKey, { in: "header", name: "Authorization" });
  assertEquals(authHeaders(credential), { authorization: "secret-token" });
});

Deno.test("auth: sign stamps the raw token, no Bearer prefix", () => {
  const request = { url: "https://dev.dixa.io/v1/agents", method: "GET", headers: {} } as never;
  const signed = apiToken.sign!({ request, credential } as never, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "secret-token");
});

Deno.test("auth: test passes on the documented {data: []} body and signs the probe itself", async () => {
  const t = test([{ body: { data: [{ id: "a" }], meta: {} } }]);
  assertEquals(await t.run(), { ok: true });
  assertEquals(t.calls[0].method, "GET");
  assertEquals(t.calls[0].url, "https://dev.dixa.io/v1/agents?pageLimit=1");
  assertEquals(t.calls[0].headers.authorization, "secret-token");
});

Deno.test("auth: a 200 that is not the documented shape is not a pass", async () => {
  const r = await test([{ body: "<html>shell</html>" }]).run();
  assertEquals(r.ok, false);
  assert(r.message?.includes("documented"), r.message);
});

Deno.test("auth: 401 quotes Dixa's own message", async () => {
  const r = await test([{ status: 401, body: { message: "Unauthorized" } }]).run();
  assertEquals(r.ok, false);
  assert(r.message?.includes("Unauthorized"), r.message);
});

Deno.test("auth: other statuses report the status and the vendor message", async () => {
  const r = await test([{ status: 500, body: { message: "There was an internal server error" } }])
    .run();
  assertEquals(r.ok, false);
  assert(r.message?.includes("HTTP 500"), r.message);
  assert(r.message?.includes("internal server error"), r.message);
});

Deno.test("auth: a missing token never reaches the network", async () => {
  const t = test([], {});
  const r = await t.run();
  assertEquals(r.ok, false);
  assertEquals(t.calls.length, 0);
});
