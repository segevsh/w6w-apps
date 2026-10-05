import { assertEquals, assertRejects } from "@std/assert";
import memberUpdate from "../../actions/member-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-update: PATCHes only the fields given, keeping false", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_1" } } }]);
  await memberUpdate.execute({
    memberId: "mem_1",
    verified: false,
    json: { a: 1 },
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/members/mem_1");
  assertEquals(JSON.parse(calls[0].body!), { verified: false, json: { a: 1 } });
});

Deno.test("member-update: an unknown member (400) surfaces as an error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("There is no member with this identifier."),
  }]);
  await assertRejects(
    () => Promise.resolve(memberUpdate.execute({ memberId: "mem_x" }, ctx)),
    Error,
    "There is no member with this identifier.",
  );
});
