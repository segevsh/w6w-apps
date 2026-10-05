import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import teamUpdate from "../../actions/team-update.ts";

Deno.test("team-update: PATCHes /teams/<id>/ with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1" } }]);
  await teamUpdate.execute({ id: "t1", parentId: "t0" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/teams/t1/");
  assertEquals(JSON.parse(calls[0].body!), { parent_id: "t0" });
});

Deno.test("team-update: refuses an empty patch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => teamUpdate.execute({ id: "t1" }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
