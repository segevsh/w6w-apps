import { assert, assertEquals } from "@std/assert";
import basic, { basicHeader, classifyProbe, PROBE_PATH } from "../../auth/basic.ts";
import type { HookContext, SignableRequest } from "@w6w/types";
import { alegraError, GATEWAY_401, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { email: "me@example.com", token: "tok123" };

Deno.test("basic: sign stamps base64(email:token) on Authorization and leaves the URL alone", () => {
  const request = { url: "https://api.alegra.com/api/v1/invoices", method: "GET", headers: {} };
  const signed = basic.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], `Basic ${btoa("me@example.com:tok123")}`);
  assertEquals(signed.url, "https://api.alegra.com/api/v1/invoices");
  assert(!signed.url.includes("tok123"));
});

Deno.test("basic: the probe is GET /api/v1/company and carries the signed header", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Empresa", applicationVersion: "colombia" } }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, true);
  assertEquals(PROBE_PATH, "/company");
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/api/v1/company");
  assertEquals(calls[0].headers["authorization"], basicHeader(CRED));
});

Deno.test("basic: a missing half fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await basic.test({ credential: { email: "only@email.com" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: the gateway's 401 is a rejected credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: GATEWAY_401 }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("rejected"), out.message);
  assert(!out.message!.includes("tok123"));
});

Deno.test("basic: a 200 that is not a company document is NOT a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("company document"), out.message);
});

Deno.test("basic: a 403 carrying Alegra's {error, code} envelope means the credential was accepted", async () => {
  const { ctx } = mockCtx([{ status: 403, body: alegraError(403, "sin permisos") }]);
  assertEquals((await basic.test({ credential: CRED }, ctx)).ok, true);
});

Deno.test("basic: a 403 with no Alegra envelope is a failure", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assertEquals((await basic.test({ credential: CRED }, ctx)).ok, false);
});

Deno.test("classifyProbe: 402/404/429/5xx are named, not conflated with a bad token", () => {
  assert(classifyProbe(402, alegraError(402, "plan")).includes("suspended"));
  assert(classifyProbe(404, null).includes("suspended account"));
  assert(classifyProbe(429, null).includes("150"));
  assert(classifyProbe(503, null).includes("not a verdict"));
  assert(classifyProbe(418, alegraError(418, "teapot")).includes("teapot"));
});
