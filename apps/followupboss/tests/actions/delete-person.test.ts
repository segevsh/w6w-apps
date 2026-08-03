import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import deletePerson from "../../actions/delete-person.ts";

Deno.test("delete-person: DELETEs and echoes the id back", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await run<{ id: number }>(deletePerson, { id: 99 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/people/99");
  assertEquals(result, { id: 99 });
});

Deno.test("delete-person: is idempotent and points at the Trash stage alternative", () => {
  assertEquals(deletePerson.idempotent, true);
  assert(deletePerson.description!.includes("Trash"));
});
