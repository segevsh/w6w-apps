import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

const refusal = {
  status: "error",
  message: "No API token provided.",
  error_code: "missing_credentials",
};

Deno.test("api: a schema-correct missing_credentials 401 from the unsigned probe is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: refusal }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/workspace");
  assertEquals(calls[0].headers["authorization"], undefined, "the probe must be unsigned");
});

Deno.test("api: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: down when the host cannot be reached at all", async () => {
  const { ctx } = mockCtx([]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: a 401 with no recognisable body is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>cf</html>", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

Deno.test("api: an unsigned 200 is a shell, not the API", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>app</html>", headers: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

Deno.test("api: unsigned, app-scoped, adds no host of its own", () => {
  assertEquals(api.kind, "service");
  assertEquals(api.credential, undefined);
  assertEquals(api.network, undefined);
});
