import { assert, assertEquals } from "@std/assert";
import listActivities from "../../actions/list-activities.ts";
import { mockCtx, param, params } from "../_helpers.ts";

Deno.test("list-activities: GETs /activities and always sends the mandatory version=v2", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listActivities.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/activities");
  assertEquals(url.searchParams.get("version"), "v2");
  assertEquals([...url.searchParams.keys()], ["version"]);
});

Deno.test("list-activities: clearing version still sends v2 — lemlist marks it required", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listActivities.execute!({ version: undefined }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("version"), "v2");
});

Deno.test("list-activities: forwards every documented filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listActivities.execute!({
    type: "emailsReplied",
    campaignId: "cam_1",
    leadId: "lea_1",
    isFirst: true,
    minDate: "2026-05-01T00:00:00Z",
    maxDate: "2026-05-31T23:59:59Z",
    offset: 100,
    limit: 100,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("type"), "emailsReplied");
  assertEquals(p.get("campaignId"), "cam_1");
  assertEquals(p.get("leadId"), "lea_1");
  assertEquals(p.get("isFirst"), "true");
  assertEquals(p.get("minDate"), "2026-05-01T00:00:00Z");
  assertEquals(p.get("maxDate"), "2026-05-31T23:59:59Z");
  assertEquals(p.get("offset"), "100");
  assertEquals(p.get("limit"), "100");
});

Deno.test("list-activities: exposes minDate/maxDate only, never the losing aliases", () => {
  // lemlist accepts startDate/endDate as aliases but documents that minDate and
  // maxDate take precedence — exposing both would let a caller build a request
  // where half their input is silently ignored.
  const keys = params(listActivities).map((p) => p.key);
  assert(keys.includes("minDate"));
  assert(keys.includes("maxDate"));
  assert(!keys.includes("startDate"));
  assert(!keys.includes("endDate"));
});

Deno.test("list-activities: accepts a Unix timestamp for the date filters too", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listActivities.execute!({ minDate: "1715385600" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("minDate"), "1715385600");
});

Deno.test("list-activities: leaves `type` an open string — lemlist publishes no closed enum", () => {
  const type = param(listActivities, "type");
  assertEquals(type.type, "string");
  assertEquals(type.options, undefined);
});

Deno.test("list-activities: is a search action returning lemlist's bare array", async () => {
  assertEquals(listActivities.type, "search");
  const body = [{ _id: "act_1", type: "manualDone", leadId: "lea_1" }];
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await listActivities.execute!({}, ctx), body);
});
