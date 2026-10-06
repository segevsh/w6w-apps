import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID, STATUS_URL, STRINGS } from "../../health/service.ts";
import { mockCtx, withRegion } from "../_helpers.ts";

function summary(over: { eu?: string; us?: string; euOther?: string; pageId?: string } = {}) {
  return {
    page: { id: over.pageId ?? PAGE_ID, name: "Phrase" },
    status: { indicator: "none" },
    components: [
      {
        id: "g-eu",
        name: "Phrase Strings (EU)",
        status: "operational",
        group: true,
        group_id: null,
      },
      {
        id: STRINGS.eu.api,
        name: "API",
        status: over.eu ?? "operational",
        group_id: STRINGS.eu.group,
      },
      {
        id: "eu-ota",
        name: "OTA",
        status: over.euOther ?? "operational",
        group_id: STRINGS.eu.group,
      },
      {
        id: STRINGS.us.api,
        name: "API",
        status: over.us ?? "operational",
        group_id: STRINGS.us.group,
      },
      { id: "tms-api", name: "API", status: "major_outage", group_id: "tms" },
    ],
  };
}

Deno.test("service: declares a connection-scoped, credential-less check on status.phrase.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.phrase.com"]);
});

Deno.test("service: all-operational EU is ok and reports the group's components", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).sort(), [STRINGS.eu.api, "eu-ota"].sort());
});

Deno.test("service: the EU verdict ignores a US outage and a TMS outage", async () => {
  const { ctx } = mockCtx([{ body: summary({ us: "major_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a US connection reads the US API component", async () => {
  const { ctx } = withRegion(mockCtx([{ body: summary({ us: "major_outage" }) }]), "us");
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assert(r.message?.includes("US"), r.message);
});

Deno.test("service: a non-API component can only degrade", async () => {
  const { ctx } = mockCtx([{ body: summary({ euOther: "major_outage" }) }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["eu-ota"].state, "degraded");
});

Deno.test("service: partial outage on the API is degraded", async () => {
  const { ctx } = mockCtx([{ body: summary({ eu: "partial_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a page that is not Phrase's is unknown, never a verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ pageId: "someoneelse" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a missing API component, a bad body and a non-200 are all unknown", async () => {
  const noApi = { page: { id: PAGE_ID }, components: [] };
  for (
    const mock of [
      { body: noApi },
      { body: "<html>shell</html>", headers: { "content-type": "text/html" } },
      { status: 503, body: "" },
    ]
  ) {
    assertEquals((await service.check!({}, mockCtx([mock]).ctx)).state, "unknown");
  }
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
