import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

const refusal = {
  status: "error",
  message: "No API token provided.",
  error_code: "missing_credentials",
};

test("api: a schema-correct missing_credentials 401 from the unsigned probe is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: refusal }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/workspace");
  assertEquals(calls[0].headers["authorization"], undefined, "the probe must be unsigned");
});

test("api: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

test("api: down when the host cannot be reached at all", async () => {
  const { ctx } = mockCtx([]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

test("api: a 401 with no recognisable body is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>cf</html>", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

test("api: an unsigned 200 is a shell, not the API", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>app</html>", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

test("api: unsigned, app-scoped, adds no host of its own", () => {
  assertEquals(api.kind, "service");
  assertEquals(api.credential, undefined);
  assertEquals(api.network, undefined);
});
