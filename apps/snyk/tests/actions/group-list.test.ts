import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

Deno.test("group-list: lists the groups above organizations", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "g1" }], links: {} } }], {
    display: {},
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/groups");
  assertEquals(result, [{ id: "g1" }]);
});
