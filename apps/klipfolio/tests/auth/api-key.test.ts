import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({
  url: "https://app.klipfolio.com/api/1.0/profile",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("api-key: sign stamps the kf-api-key header and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { apiKey: "key123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { "kf-api-key": "key123" });
  assertEquals((out as typeof request).url, "https://app.klipfolio.com/api/1.0/profile");
});

Deno.test("api-key: declares the header and a required secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "kf-api-key" });
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("api-key: test passes on a profile record and probes GET /profile", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1" }, meta: { success: true } } }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
  assertEquals(calls[0].url, "https://app.klipfolio.com/api/1.0/profile");
  assertEquals(calls[0].headers["kf-api-key"], "k");
});

Deno.test("api-key: test fails a 200 that carries no user record", async () => {
  const { ctx } = mockCtx([{ body: { data: {}, meta: {} } }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, false);
});

Deno.test("api-key: test reads the verdict from the body on a 401", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      meta: {
        success: false,
        status: 401,
        error_code: "auth_fail",
        error_desc: "The credentials you provided are invalid",
      },
    },
  }]);
  const r = await auth.test!({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message, "The credentials you provided are invalid");
});

Deno.test("api-key: test fails a non-error body that is not Klipfolio's", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "<html>nope</html>" }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("non-error body"));
});

Deno.test("api-key: test reports a 5xx as an outage and a missing key without a request", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { meta: { success: false, status: 500, error_desc: "boom" } },
  }]);
  assert((await auth.test!({ credential: { apiKey: "k" } }, ctx)).message!.includes("erroring"));
  const none = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});

Deno.test("api-key: test reports an unreachable host", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("could not reach"));
});
