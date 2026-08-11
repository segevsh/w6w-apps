import { assertEquals, assertRejects } from "@std/assert";
import getUser from "../../actions/get-user.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-user: puts the id in the path and unwraps `user`", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 42, first_name: "Grace" } } }]);
  const out = await getUser.execute({ userId: 42 }, ctx) as { first_name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_user/42");
  assertEquals(out.first_name, "Grace");
});

Deno.test("get-user: a non-integer id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await getUser.execute({ userId: "1/../../delete_group/2" as unknown as number }, ctx),
    Error,
    "userId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-user: a 403 keeps its status — no visibility is not not-found", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(["you do not have permission"]) }]);
  await assertRejects(
    async () => await getUser.execute({ userId: 42 }, ctx),
    Error,
    "Splitwise 403",
  );
});
