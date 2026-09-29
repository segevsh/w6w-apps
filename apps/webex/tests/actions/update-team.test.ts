import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-team.ts";

Deno.test("update-team: PUTs /teams/{teamId} with name required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute({ teamId: "t1", name: "New Name" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams/t1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});

Deno.test("update-team: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
