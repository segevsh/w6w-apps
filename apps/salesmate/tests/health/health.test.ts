import { assertEquals } from "@std/assert";
import { mockCtx, mockSalesmateCtx } from "../_helpers.ts";
import domain from "../../health/domain.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

Deno.test("domain: needs the Connection for a URL but no credential to read it", () => {
  assertEquals(domain.kind, "dependency");
  assertEquals(domain.scope, "connection");
  assertEquals(domain.credential, "context");
  assertEquals(domain.network, undefined);
});

Deno.test("domain: the vendor's AuthorizationFailed (403) passes — the host is serving", async () => {
  const { ctx, calls } = mockSalesmateCtx([{
    status: 403,
    body: { Status: "failure", Error: { message: "", name: "AuthorizationFailed" } },
  }]);
  assertEquals((await domain.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://acme.salesmate.io/apis/core/v4/users?status=active");
  assertEquals(calls[0].headers["x-linkname"], "acme.salesmate.io");
  assertEquals("accesstoken" in calls[0].headers, false);
});

Deno.test("domain: NoSuchLinkExist (404) is a missing account, not a bad credential", async () => {
  const { ctx } = mockSalesmateCtx([{
    status: 404,
    body: { Status: "failure", Error: { message: "Link  not found", name: "NoSuchLinkExist" } },
  }]);
  const out = await domain.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("domain: a 5xx is down", async () => {
  const { ctx } = mockSalesmateCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await domain.check!({}, ctx)).state, "down");
});

Deno.test("domain: unknown, without a request, when the connection records no link name", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await domain.check!({}, ctx), {
    state: "unknown",
    message: "connection records no link name",
  });
  assertEquals(calls.length, 0);
});

Deno.test("service and quota: declared absences carry informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.severity, "informational");
    assertEquals(h.check, undefined);
  }
});
