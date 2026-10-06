import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (api: string, extra: Array<Record<string, unknown>> = []) => ({
  success: true,
  data: {
    slug: "productive",
    cname: "status.productive.io",
    components: [
      { id: 1, name: "Group", is_group: true, status: "operational" },
      { id: API_COMPONENT_ID, name: "API Requests", status: api },
      { id: 2, name: "Searching", status: "operational" },
      ...extra,
    ],
    active_incidents: [],
  },
});
const run = (body: unknown, status = 200) => {
  const m = mockCtx([{ status, body }]);
  return Promise.resolve(service.check!({} as never, m.ctx)).then((r) => ({ r, ...m }));
};

Deno.test("service: declares itself, its host and no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.productive.io"]);
  assertEquals(STATUS_URL, "https://status.productive.io/statuspage/productive/ajax");
});

Deno.test("mapComponentStatus: every Uptime.com status maps, unknown values stay unknown", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded-performance"), "degraded");
  assertEquals(mapComponentStatus("partial-outage"), "degraded");
  assertEquals(mapComponentStatus("under-maintenance"), "degraded");
  assertEquals(mapComponentStatus("major-outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: API Requests operational is ok and reads only the status host", async () => {
  const { r, calls } = await run(page("operational"));
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(Object.keys(r.components ?? {}).length, 2, "group rows are not components");
});

Deno.test("service: the API component decides; other components are only detail", async () => {
  const { r } = await run(
    page("operational", [{ id: 3, name: "Mailing", status: "major-outage" }]),
  );
  assertEquals(r.state, "ok");
  assert(/Mailing \(major-outage\)/.test(r.message ?? ""), r.message);
  const down = await run(page("major-outage"));
  assertEquals(down.r.state, "down");
  const deg = await run(page("partial-outage"));
  assertEquals(deg.r.state, "degraded");
});

Deno.test("service: the API component is found by name when its id changes", async () => {
  const body = page("operational");
  body.data.components[1].id = 999;
  body.data.components[1].status = "major-outage";
  assertEquals((await run(body)).r.state, "down");
});

Deno.test("service: a broken or foreign status page is unknown, never down", async () => {
  assertEquals((await run("nope", 500)).r.state, "unknown");
  assertEquals((await run("<html>")).r.state, "unknown");
  assertEquals((await run({ data: {} })).r.state, "unknown");
  const foreign = page("major-outage");
  foreign.data.slug = "other";
  assertEquals((await run(foreign)).r.state, "unknown");
  const noApi = page("operational");
  noApi.data.components.splice(1, 1);
  assertEquals((await run(noApi)).r.state, "unknown");
  const empty = page("operational");
  empty.data.components = [];
  assertEquals((await run(empty)).r.state, "unknown");
});

Deno.test("service: an active incident is reported", async () => {
  const body = page("operational");
  body.data.active_incidents = [{ name: "x" }] as never;
  assert(/1 active incident/.test((await run(body)).r.message ?? ""));
});
