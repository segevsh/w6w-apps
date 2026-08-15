import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: fetches a single user by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "USR1", email: "kevin@example.com", role: "admin" },
  }]);
  const out = await userGet.execute({ accountId: "ACC1", userId: "USR1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/users/USR1.json");
  assertEquals(out, { id: "USR1", email: "kevin@example.com", role: "admin" });
});

Deno.test("user-get: no password field is ever a param — CallRail disallows password mgmt via API", () => {
  const keys = userGet.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("password"), false);
});
