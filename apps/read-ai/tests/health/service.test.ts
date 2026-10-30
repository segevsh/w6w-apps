import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (api: string, other = "operational") => ({
  page: { id: "bqc0948459l6", name: "Read AI", url: "https://status.read.ai" },
  components: [
    { id: API_COMPONENT_ID, name: "API", status: api, group: false },
    { id: "g", name: "Meeting Platforms", status: other, group: true },
    { id: "z", name: "Zoom Meeting Bots", status: other, group: false },
  ],
});

test("service: all operational is ok and group rows are not reported", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), [API_COMPONENT_ID, "z"].sort());
});

test("service: API outage is down", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "down");
});

test("service: a bot outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message?.includes("Zoom Meeting Bots"), true);
});

test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "x" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

test("service: foreign page and missing API component are unknown", async () => {
  const foreign = { ...summary("operational"), page: { name: "Other Co" } };
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: foreign }]).ctx)).state,
    "unknown",
  );
  const noApi = {
    page: { name: "Read AI" },
    components: [{ id: "z", name: "Web", status: "operational" }],
  };
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: noApi }]).ctx)).state,
    "unknown",
  );
});

test("service: status vocabulary maps", () => {
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
});
