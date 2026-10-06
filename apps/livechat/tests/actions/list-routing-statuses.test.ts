import { assertEquals } from "@std/assert";
import action from "../../actions/list-routing-statuses.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-routing-statuses: no filter sends an empty body", async () => {
  const rows = [{ agent_id: "a@x.co", status: "accepting_chats" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await action.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/list_routing_statuses");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { items: rows, count: 1 });
});

Deno.test("list-routing-statuses: group filter is integers, 0 included", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ groupIds: "0,3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filters: { group_ids: [0, 3] } });
});

Deno.test("list-routing-statuses: a non-array body is kept as raw", async () => {
  const { ctx } = mockCtx([{ body: { odd: true } }]);
  assertEquals(await action.execute({}, ctx), { items: [], count: 0, raw: { odd: true } });
});
