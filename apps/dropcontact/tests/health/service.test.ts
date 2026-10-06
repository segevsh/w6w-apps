import { assertEquals } from "@std/assert";
import service, { mapComponentStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (apiStatus: string, appStatus = "operational", id = "x803htx24trw") => ({
  page: { id, name: "Dropcontact" },
  components: [
    { id: "hdj96nlnshmj", name: "Dropcontact API", status: apiStatus, group: false },
    { id: "gp1g28gtn3f4", name: "Dropcontact APP", status: appStatus, group: false },
  ],
});

Deno.test("service: unsigned, scoped to status.dropcontact.com, API component decides", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.dropcontact.com"]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.dropcontact.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: API outage is down; a web-app outage is capped at degraded detail", async () => {
  const down = await service.check!({}, mockCtx([{ body: page("major_outage") }]).ctx);
  assertEquals(down.state, "down");
  const app = await service.check!(
    {},
    mockCtx([{ body: page("operational", "major_outage") }]).ctx,
  );
  assertEquals(app.state, "ok");
  assertEquals(app.components?.["gp1g28gtn3f4"].state, "degraded");
});

Deno.test("service: foreign page, missing component, HTTP error and bad body are unknown", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page("operational", "operational", "zzz") }]).ctx))
      .state,
    "unknown",
  );
  const noApi = {
    page: { id: "x803htx24trw", name: "Dropcontact" },
    components: [{ id: "a", name: "Dropcontact APP", status: "operational" }],
  };
  assertEquals((await service.check!({}, mockCtx([{ body: noApi }]).ctx)).state, "unknown");
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "not json" }]).ctx)).state, "unknown");
});

Deno.test("service: component status vocabulary maps as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
