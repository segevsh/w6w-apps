import { assertEquals } from "@std/assert";
import listSchedules from "../../actions/list-schedules.ts";
import { mockCtx, outputFields, params } from "../_helpers.ts";

Deno.test("list-schedules: GETs /schedules with no invented defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { schedules: [] } }]);
  await listSchedules.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/schedules");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-schedules: forwards page, offset, limit and sort", async () => {
  const { ctx, calls } = mockCtx([{ body: { schedules: [] } }]);
  await listSchedules.execute!({
    page: 1,
    offset: 0,
    limit: 2,
    sortBy: "createdAt",
    sortOrder: "desc",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("page"), "1");
  assertEquals(p.get("offset"), "0");
  assertEquals(p.get("limit"), "2");
  assertEquals(p.get("sortBy"), "createdAt");
  assertEquals(p.get("sortOrder"), "desc");
});

Deno.test("list-schedules: returns lemlist's ENVELOPE, unlike the bare-array list routes", async () => {
  const body = {
    schedules: [{
      _id: "skd_1",
      name: "Custom Schedule",
      timezone: "Europe/Paris",
      start: "09:00",
      end: "18:00",
      weekdays: [1, 2, 3, 4],
      secondsToWait: 1200,
    }],
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await listSchedules.execute!({}, ctx), body);
  assertEquals(outputFields(listSchedules).map((o) => o.key), ["schedules"]);
});

Deno.test("list-schedules: is a search action with no required params", () => {
  assertEquals(listSchedules.type, "search");
  assertEquals(params(listSchedules).filter((p) => p.required).length, 0);
});
