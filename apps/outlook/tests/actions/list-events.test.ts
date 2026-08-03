import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

Deno.test("list-events: GETs the default calendar's events", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "e1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/events");
  assertEquals(out.value.length, 1);
});

Deno.test("list-events: scopes to a named calendar", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ calendarId: "cal-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/events");
});

Deno.test("list-events: combines both Prefer headers on one line", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ timeZone: "Pacific Standard Time", bodyContentType: "text" }, ctx);
  assertEquals(
    calls[0].headers["prefer"],
    'outlook.body-content-type="text", outlook.timezone="Pacific Standard Time"',
  );
});

Deno.test("list-events: forwards the OData params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ filter: "subject eq 'Sync'", orderby: "start/dateTime", top: 3 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("$filter"), "subject eq 'Sync'");
  assertEquals(params.get("$orderby"), "start/dateTime");
  assertEquals(params.get("$top"), "3");
});

Deno.test("list-events: keeps the Prefer header when continuing from a nextLink", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/events?$skip=25";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, timeZone: "UTC" }, ctx);
  assertEquals(calls[0].url, link);
  assertEquals(calls[0].headers["prefer"], 'outlook.timezone="UTC"');
});
