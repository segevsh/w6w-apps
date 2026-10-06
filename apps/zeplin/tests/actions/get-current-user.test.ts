import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-current-user.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-current-user: GETs /users/me and returns the vendor object", async () => {
  const doc = { id: "x", name: "N" };
  const { ctx, calls } = mockCtx([{ body: doc }]);
  assertEquals(await action.execute({}, ctx), doc);
  const u = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(u.origin + u.pathname, "https://api.zeplin.dev/v1/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-current-user: a 404 is thrown with the vendor message and a membership hint", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "Not Found");
});
