import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: a 403 'Not authenticated' from the unsigned probe is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { detail: "Not authenticated" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/info");
  assertEquals(calls[0].headers["x-user-api-key"], undefined, "the probe must be unsigned");
});

Deno.test("service: a 401 'Invalid API Key' is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the documented {error_message} envelope also proves reachability", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: true, error_message: "Unauthorized" } }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { detail: "unavailable" } }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: down when the host cannot be reached at all", async () => {
  const { ctx } = mockCtx([]); // the mock throws on an unexpected fetch
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a 403 with no recognisable body is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "<html>cdn</html>", headers: {} }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unsigned 200 is a shell, not the API", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>app</html>", headers: {} }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: unsigned, app-scoped, adds no host of its own", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, undefined); // defaults to "none" for kind:"service"
  assertEquals(service.network, undefined);
});
