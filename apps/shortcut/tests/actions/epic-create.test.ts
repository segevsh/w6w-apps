import { assertEquals } from "@std/assert";
import epicCreate from "../../actions/epic-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("epic-create: posts only name when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await epicCreate.execute({ name: "Q4 Launch" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/epics");
  assertEquals(JSON.parse(calls[0].body!), { name: "Q4 Launch" });
});

Deno.test("epic-create: converts multiselect ids to arrays under wire names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await epicCreate.execute({ name: "Q4 Launch", ownerIds: "u1,u2", groupIds: ["g1"] }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    name: "Q4 Launch",
    owner_ids: ["u1", "u2"],
    group_ids: ["g1"],
  });
});
