import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-channels.ts";

Deno.test("list-channels: GETs /teams/{id}/channels", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "19:abc@thread.tacv2" }] } }]);
  const out = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/teams/t1/channels");
  assertEquals(out.value.length, 1);
});

Deno.test("list-channels: passes $filter and $select through", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    teamId: "t1",
    filter: "membershipType eq 'private'",
    select: ["id", "displayName"],
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$filter"), "membershipType eq 'private'");
  assertEquals(q.get("$select"), "id,displayName");
});

Deno.test("list-channels: offers no page size — the endpoint documents no $top", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys, ["teamId", "filter", "select", "nextLink", "all", "maxPages"]);
});

Deno.test("list-channels: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/teams/t1/channels?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ teamId: "t1", nextLink: link, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-channels: walks every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/teams/t1/channels?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ teamId: "t1", all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.pages, 2);
});
