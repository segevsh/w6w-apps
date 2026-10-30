import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import tenant from "../../health/tenant.ts";

test("tenant: ok on any HTTP response, including a 401", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 401, body: "" }],
    { display: { baseUrl: "https://live-mt-server.wati.io/12345" } },
  );
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/account/credits");
});

test("tenant: ok directly on a 200", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { credit: 1 } }],
    { display: { baseUrl: "https://live-mt-server.wati.io/12345" } },
  );
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "ok");
});

test("tenant: down when the endpoint cannot be reached at the network level", async () => {
  const { ctx } = mockCtx([], { display: { baseUrl: "https://live-mt-server.wati.io/12345" } });
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "down");
});

test("tenant: unknown when the connection records no endpoint", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("tenant: is declared unsigned (credential: context)", () => {
  assertEquals(tenant.credential, "context");
  assertEquals(tenant.scope, "connection");
});
