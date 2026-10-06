import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const AEP = {
  vendor_name: "Action Network",
  osdi_version: "1.1.1",
  max_page_size: 25,
  _links: { "osdi:people": { href: "https://actionnetwork.org/api/v2/people" } },
};

Deno.test("api: is an unsigned dependency check", () => {
  assertEquals([check.kind, check.credential, check.severity], ["dependency", "none", "degraded"]);
});

Deno.test("api: the documented AEP is ok and no credential is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: AEP }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://actionnetwork.org/api/v2/");
  assert(!("osdi-api-token" in calls[0].headers));
  assert(!("authorization" in calls[0].headers));
});

Deno.test("api: a 200 that is not the AEP is degraded", async () => {
  const { ctx } = mockCtx([{ body: "<html>maintenance</html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
  const other = mockCtx([{ body: { vendor_name: "Other", _links: {} } }]);
  assertEquals((await check.check!({}, other.ctx)).state, "degraded");
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("api: a 404 is degraded", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "nope" } }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("tls")), log: () => {} } as never;
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("could not reach"));
});
