import { assert, assertEquals } from "@std/assert";
import service, { mapIndicator, STATUS_URL } from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const page = {
  id: "p",
  name: "Ironclad Contract Management",
  url: "https://status.ironcladapp.com/",
};

Deno.test("service: ok when the indicator is none, with no credential and the declared host", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page,
      status: { indicator: "none", description: "All Systems Operational" },
      components: [],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.ironcladapp.com"]);
});

Deno.test("service: lists non-operational components and degrades on minor", async () => {
  const { ctx } = mockCtx([{
    body: {
      page,
      status: { indicator: "minor" },
      components: [{ name: "Workflows", status: "degraded_performance" }, {
        name: "Editor",
        status: "operational",
      }],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message!.includes("Workflows (degraded_performance)"));
  assert(!out.message!.includes("Editor"));
});

Deno.test("service: major and critical are down", () => {
  assertEquals(mapIndicator("major"), "down");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("weird"), "unknown");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: a failing status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "oops" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Ironclad's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: { page: { url: "https://status.other.example/" }, status: { indicator: "none" } },
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 20);
});
