import { assertEquals, assertRejects } from "@std/assert";
import groupMemberAdd from "../../actions/group-member-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-member-add: sends POST /groups/${seg(input.groupId)}/members", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7 } }]);
  const out = await groupMemberAdd.execute(
    { "groupId": 2, "email": "m@a.co", "name": "Mo", "role": "manager" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/groups/2/members");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "email": "m@a.co",
    "name": "Mo",
    "role": "manager",
  });
  assertEquals(out, { "id": 7 });
});

Deno.test("group-member-add: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      groupMemberAdd.execute(
        { "groupId": 2, "email": "m@a.co", "name": "Mo", "role": "manager" } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
