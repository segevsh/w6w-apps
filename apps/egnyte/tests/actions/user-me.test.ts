import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/user-me.ts";

Deno.test("user-me: GETs /v1/userinfo", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { id: 1, username: "jo" } }]);
  assertEquals(await action.execute({}, ctx), { id: 1, username: "jo" });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/userinfo");
});
