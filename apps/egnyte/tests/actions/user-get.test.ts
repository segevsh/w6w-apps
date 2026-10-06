import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /v2/users/<id>", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { id: 12, userName: "jo" } }]);
  assertEquals(await action.execute({ userId: 12 }, ctx), { id: 12, userName: "jo" });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v2/users/12");
});
