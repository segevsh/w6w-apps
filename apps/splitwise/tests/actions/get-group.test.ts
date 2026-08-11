import { assertEquals, assertRejects } from "@std/assert";
import getGroup from "../../actions/get-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-group: puts the id in the path and unwraps `group`", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      group: { id: 321, name: "Housemates", invite_link: "https://www.splitwise.com/join/x" },
    },
  }]);
  const out = await getGroup.execute({ groupId: 321 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_group/321");
  assertEquals(out.name, "Housemates");
});

Deno.test("get-group: a non-integer id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await getGroup.execute({ groupId: "abc" as unknown as number }, ctx),
    Error,
    "groupId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});
