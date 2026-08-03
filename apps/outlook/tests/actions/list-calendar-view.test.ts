import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-calendar-view.ts";

Deno.test("list-calendar-view: GETs the default calendar's view with the required range", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "e1" }] } }]);
  const out = await action.execute({
    startDateTime: "2026-08-01T00:00:00-07:00",
    endDateTime: "2026-08-08T00:00:00-07:00",
  }, ctx);

  const url = new URL(calls[0].url);
  // The singular `/calendar/` segment is the form Graph documents for /me.
  assertEquals(url.pathname, "/v1.0/me/calendar/calendarView");
  assertEquals(url.searchParams.get("startDateTime"), "2026-08-01T00:00:00-07:00");
  assertEquals(url.searchParams.get("endDateTime"), "2026-08-08T00:00:00-07:00");
  assertEquals(out.value.length, 1);
});

Deno.test("list-calendar-view: uses the plural per-calendar form when scoped", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    calendarId: "cal-1",
    startDateTime: "2026-08-01T00:00:00Z",
    endDateTime: "2026-08-02T00:00:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/calendarView");
});

Deno.test("list-calendar-view: the range params are not OData `$` parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    startDateTime: "2026-08-01T00:00:00Z",
    endDateTime: "2026-08-02T00:00:00Z",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("$startDateTime"), null);
  assertEquals(params.get("startDateTime"), "2026-08-01T00:00:00Z");
});

Deno.test("list-calendar-view: declares both range bounds required", () => {
  assertEquals(action.params?.find((p) => p.key === "startDateTime")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "endDateTime")?.required, true);
});

Deno.test("list-calendar-view: follows nextLink across pages", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/calendar/calendarView?$skip=50";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({
    startDateTime: "2026-08-01T00:00:00Z",
    endDateTime: "2026-08-02T00:00:00Z",
    all: true,
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
