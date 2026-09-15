import { assertEquals } from "@std/assert";
import personDelete from "../../actions/person-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-delete - DELETEs /people/{id} and returns a confirmation", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await personDelete.execute({ people_id: 9 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/people/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true, people_id: 9 });
});
