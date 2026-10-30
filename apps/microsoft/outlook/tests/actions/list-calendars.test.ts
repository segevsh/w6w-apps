import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-calendars.ts";

test("list-calendars: GETs /me/calendars", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "c1", name: "Calendar" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars");
  assertEquals(out.value.length, 1);
  assertEquals(out.pages, 1);
});

test("list-calendars: forwards $select, $filter, $orderby and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    select: ["id", "name"],
    filter: "canEdit eq true",
    orderby: "name",
    top: 5,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("$select"), "id,name");
  assertEquals(params.get("$filter"), "canEdit eq true");
  assertEquals(params.get("$orderby"), "name");
  assertEquals(params.get("$top"), "5");
});

test("list-calendars: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/calendars?$skip=50";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 999 }, ctx);
  assertEquals(calls[0].url, link);
});
