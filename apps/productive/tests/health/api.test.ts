import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { errorBody, mockCtx, type MockResponse } from "../_helpers.ts";

const run = (resp: MockResponse) => {
  const m = mockCtx([resp]);
  return Promise.resolve(api.check!({} as never, m.ctx)).then((r) => ({ r, ...m }));
};

Deno.test("api: an unsigned probe, no credential, and a 401 envelope is ok", async () => {
  const { r, calls } = await run({
    status: 401,
    body: errorBody("401", "invalid_auth_token", "Unauthenticated"),
  });
  assertEquals(r.state, "ok");
  assertEquals(api.credential, "none");
  assertEquals(calls[0].url, "https://api.productive.io/api/v2/projects?page[size]=1");
  assertEquals(calls[0].headers["x-auth-token"], undefined);
  assertEquals(calls[0].headers["x-organization-id"], undefined);
});

Deno.test("api: a 5xx is down, a non-JSON body is down, a foreign JSON body is unknown", async () => {
  assertEquals((await run({ status: 503, body: { errors: [{ title: "x" }] } })).r.state, "down");
  assertEquals((await run({ status: 200, body: "<html>" })).r.state, "down");
  assertEquals((await run({ status: 200, body: { hello: "world" } })).r.state, "unknown");
});

Deno.test("quota: a declared absence at informational severity with no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert((quota.unavailable?.reason ?? "").length > 20);
  assertEquals(quota.check, undefined);
});
