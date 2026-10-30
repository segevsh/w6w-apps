import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import memberGet from "../../actions/member-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("member-get: GETs /members/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mber_1" } }]);
  const out = await memberGet.execute({ memberId: "mber_1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/members/mber_1");
  assertEquals(out.id, "mber_1");
});
