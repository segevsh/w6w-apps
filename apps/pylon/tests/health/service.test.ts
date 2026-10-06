import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (api: string, other = "operational") => ({
  page: { id: PAGE_ID, name: "Pylon" },
  status: { description: "All good", indicator: "none" },
  components: [
    { id: "1", name: "API", status: api },
    { id: "2", name: "Chat & Messaging", status: other },
  ],
});
// deno-lint-ignore no-explicit-any
const run = (ctx: any) => service.check!({} as any, ctx);

Deno.test("service: declares only the status host", () => {
  assertEquals(service.network?.allow, ["status.usepylon.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("mapComponentStatus: maps the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("service: ok when API operational", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  const r = await run(ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), ["api", "chat-messaging"]);
});

Deno.test("service: the API component alone decides; other outages are detail", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "major_outage") }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components!["chat-messaging"].state, "down");
});

Deno.test("service: API outage is down", async () => {
  const { ctx } = mockCtx([{ body: page("major_outage") }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("service: a wrong page, a missing API component, a failing page are unknown", async () => {
  const wrong = mockCtx([{ body: { ...page("operational"), page: { id: "x", name: "Pylon" } } }]);
  assertEquals((await run(wrong.ctx)).state, "unknown");
  const none = mockCtx([{ body: { page: { id: PAGE_ID, name: "Pylon" }, components: [] } }]);
  assertEquals((await run(none.ctx)).state, "unknown");
  const bad = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await run(bad.ctx)).state, "unknown");
  const junk = mockCtx([{ body: "not json" }]);
  assertEquals((await run(junk.ctx)).state, "unknown");
});
