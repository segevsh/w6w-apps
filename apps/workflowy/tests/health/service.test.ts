import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = { id: "m8f43n57h83g", name: "WorkFlowy", url: "https://status.workflowy.com" };
const comp = (id: string, name: string, status: string) => ({ id, name, status, group: false });
const run = (ctx: never) => service.check!({} as never, ctx);

Deno.test("service: all operational is ok, keyed by component id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page,
      components: [comp("a", "Web App", "operational"), comp("b", "API", "operational")],
    },
  }]);
  const r = await run(ctx as never);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), ["a", "b"]);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: the API component decides; another component's outage does not", async () => {
  const web = mockCtx([{
    body: {
      page,
      components: [comp("a", "iOS App", "major_outage"), comp("b", "API", "operational")],
    },
  }]);
  assertEquals((await run(web.ctx as never)).state, "ok");
  const api = mockCtx([{
    body: { page, components: [comp("a", "API", "major_outage")] },
  }]);
  assertEquals((await run(api.ctx as never)).state, "down");
  const part = mockCtx([{ body: { page, components: [comp("a", "API", "partial_outage")] } }]);
  assertEquals((await run(part.ctx as never)).state, "degraded");
});

Deno.test("service: a foreign page, missing API component or bad HTTP is unknown, never down", async () => {
  const foreign = mockCtx([{
    body: {
      page: { url: "https://status.other.com" },
      components: [comp("a", "API", "operational")],
    },
  }]);
  assertEquals((await run(foreign.ctx as never)).state, "unknown");
  const noApi = mockCtx([{ body: { page, components: [comp("a", "Web App", "operational")] } }]);
  assertEquals((await run(noApi.ctx as never)).state, "unknown");
  const bad = mockCtx([{ status: 500, body: "x" }]);
  assertEquals((await run(bad.ctx as never)).state, "unknown");
  const empty = mockCtx([{ body: { page, components: [] } }]);
  assertEquals((await run(empty.ctx as never)).state, "unknown");
});

Deno.test("service: mapComponentStatus vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
});
