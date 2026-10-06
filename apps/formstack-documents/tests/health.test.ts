import { assertEquals } from "@std/assert";
import { mockCtx } from "./_helpers.ts";
import service, { GROUP_ID, mapComponentStatus } from "../health/service.ts";
import quota from "../health/quota.ts";

const page = (api: string, web = "operational", other = "operational") => ({
  page: { name: "Intellistack", url: "https://www.intellistackstatus.com" },
  components: [
    { id: GROUP_ID, name: "Formstack Documents", group: true, group_id: null },
    { id: "c1", name: "API & Document Generation", status: api, group: false, group_id: GROUP_ID },
    {
      id: "c2",
      name: "Website & Management Portal",
      status: web,
      group: false,
      group_id: GROUP_ID,
    },
    { id: "c3", name: "SendGrid SMTP", status: other, group: false, group_id: GROUP_ID },
    { id: "g2", name: "Formstack Forms", group: true, group_id: null },
    { id: "x1", name: "Main Application", status: "major_outage", group: false, group_id: "g2" },
  ],
});

const run = (body: unknown, status = 200) =>
  service.check!({}, mockCtx([{ status, body }]).ctx) as Promise<
    { state: string; message?: string; components?: Record<string, unknown> }
  >;

Deno.test("service: all operational -> ok, ignoring other products' outages", async () => {
  const r = await run(page("operational"));
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), ["c1", "c2", "c3"]);
});

Deno.test("service: API outage -> down; website degraded -> degraded", async () => {
  assertEquals((await run(page("major_outage"))).state, "down");
  assertEquals((await run(page("operational", "partial_outage"))).state, "degraded");
});

Deno.test("service: SendGrid trouble is reported but does not drive the verdict", async () => {
  const r = await run(page("operational", "operational", "major_outage"));
  assertEquals(r.state, "ok");
  assertEquals((r.components as Record<string, { state: string }>).c3.state, "down");
});

Deno.test("service: unreadable, wrong page, and missing group are unknown, never down", async () => {
  assertEquals((await run("x", 500)).state, "unknown");
  assertEquals((await run({ page: { name: "Other Corp" }, components: [] })).state, "unknown");
  const none = page("operational");
  none.components = none.components.slice(4);
  assertEquals((await run(none)).state, "unknown");
});

Deno.test("service: status vocabulary maps", () => {
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("quota: is a declared absence at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
