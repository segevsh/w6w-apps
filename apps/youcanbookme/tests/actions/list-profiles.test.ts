import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-profiles.ts";

test("list-profiles: GETs /{accountId}/profiles with default fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ accountId: "acc-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles");
  assertEquals(
    url.searchParams.get("fields"),
    "id,accountId,title,description,subdomain,timeZone,status,calendarIds,targetCalendarId",
  );
});

test("list-profiles: honours an explicit fields override", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ accountId: "acc-1", fields: "id,title" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "id,title");
});
