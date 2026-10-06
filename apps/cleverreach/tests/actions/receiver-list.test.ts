import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("receiver-list: calls the group receivers list with every filter", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1, email: "a@b.co" }, { id: 2, email: "c@d.co" }],
  }]);
  const out = await action.execute({
    groupId: "5",
    pageSize: 2,
    page: 1,
    type: "active",
    detail: 5,
    emailList: "a@b.co, c@d.co",
    idList: "1,2",
    orderBy: "email asc",
  }, ctx) as { count: number; nextPage: number | null };
  assertEquals(pathOf(calls[0].url), "/v3/groups/5/receivers");
  assertEquals(queryOf(calls[0].url), {
    pagesize: "2",
    page: "1",
    type: "active",
    detail: "5",
    email_list: "a@b.co,c@d.co",
    id_list: "1,2",
    order_by: "email asc",
  });
  assertEquals(out.count, 2);
  assertEquals(out.nextPage, 2);
});

Deno.test("receiver-list: a short page ends the pagination", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({ groupId: "5", pageSize: 10 }, ctx) as {
    nextPage: number | null;
  };
  assertEquals(out.nextPage, null);
});

Deno.test("receiver-list: validates the page size and type before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "5", pageSize: 5001 }, ctx),
    Error,
    "`pageSize` must be an integer",
  );
  await assertRejects(
    async () => await action.execute({ groupId: "5", type: "x" }, ctx),
    Error,
    "`type` must be one of",
  );
  assertEquals(calls.length, 0);
});
