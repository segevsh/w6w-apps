import { assertEquals } from "@std/assert";
import service, { GROUP_ID, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (members: Array<[string, string]>, page = PAGE_ID) => ({
  page: { id: page, name: "Oracle NetSuite Service" },
  components: [
    { id: GROUP_ID, name: "SuiteTalk", group: true, status: "operational" },
    { id: "other-g", name: "SuiteCommerce", group: true, status: "operational" },
    { id: "c-other", name: "Tokyo", group: false, group_id: "other-g", status: "major_outage" },
    ...members.map(([name, status], i) => ({
      id: `m${i}`,
      name,
      status,
      group: false,
      group_id: GROUP_ID,
    })),
  ],
});

Deno.test("service: all SuiteTalk data centers operational is ok, whatever other groups do", async () => {
  const { ctx, calls } = mockCtx([{
    body: summary([["US 1", "operational"], ["EU 1", "operational"]]),
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: an affected data center is degraded, never down, and is named", async () => {
  const { ctx } = mockCtx([{ body: summary([["US 1", "major_outage"], ["EU 1", "operational"]]) }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message?.includes("US 1 (major_outage)"), true);
  assertEquals(r.message?.includes("1 of 2"), true);
});

Deno.test("service: a page that is not NetSuite's, or has no group, is unknown", async () => {
  let m = mockCtx([{ body: summary([["US 1", "operational"]], "someone-else") }]);
  assertEquals((await service.check!({} as never, m.ctx)).state, "unknown");
  m = mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]);
  assertEquals((await service.check!({} as never, m.ctx)).state, "unknown");
  m = mockCtx([{ body: summary([]) }]);
  assertEquals((await service.check!({} as never, m.ctx)).state, "unknown");
});

Deno.test("service: HTTP errors and unreadable bodies are unknown", async () => {
  let m = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({} as never, m.ctx)).state, "unknown");
  m = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({} as never, m.ctx)).state, "unknown");
});

Deno.test("service: declares only the status host", () => {
  assertEquals(service.network?.allow, ["status.netsuite.com"]);
});
