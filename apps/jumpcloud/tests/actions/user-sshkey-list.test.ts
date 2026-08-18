import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-sshkey-list.ts";

const display = { display: { region: "us" } };

Deno.test("user-sshkey-list: reads the user's keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ _id: "k1", name: "laptop" }] }], display);
  const result = await action.execute!({ userId: "u1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1/sshkeys");
  assertEquals(result, [{ _id: "k1", name: "laptop" }]);
});

Deno.test("user-sshkey-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`userId`");
  assertEquals(calls.length, 0);
});
