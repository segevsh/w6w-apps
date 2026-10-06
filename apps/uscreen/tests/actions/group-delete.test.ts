import { assertEquals, assertRejects } from "@std/assert";
import groupDelete from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-delete: sends DELETE /groups/${seg(input.groupId)} and reports ok on an empty 200", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await groupDelete.execute({ "groupId": 2 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/groups/2");
  assertEquals(out, { ok: true });
});

Deno.test("group-delete: a 404 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    () => groupDelete.execute({ "groupId": 2 } as never, ctx) as Promise<unknown>,
    Error,
    "Not Found",
  );
});
