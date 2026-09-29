import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-team.ts";

Deno.test("create-team: POSTs /teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute({ name: "Engineering" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams");
  assertEquals(JSON.parse(calls[0].body!), { name: "Engineering" });
});

Deno.test("create-team: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
