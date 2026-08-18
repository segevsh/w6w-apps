import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-password-set.ts";

const display = { display: { region: "us" } };

Deno.test("user-password-set: POSTs the password, and logs only the id", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ userId: "u1", password: "s3cret!" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1/password");
  assertEquals(JSON.parse(calls[0].body!), { password: "s3cret!" });
  assertEquals(result, { userId: "u1", passwordSet: true });
  assert(!JSON.stringify(logs).includes("s3cret"), "the password reached a log line");
});

Deno.test("user-password-set: the password is a secret field", () => {
  const param = (action.params as Array<{ key: string; type: string }>)
    .find((p) => p.key === "password")!;
  assertEquals(param.type, "secret");
});

Deno.test("user-password-set: id and password are both required, before any request", async () => {
  const noId = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ password: "x" }, noId.ctx),
    Error,
    "`userId`",
  );
  const noPassword = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, noPassword.ctx),
    Error,
    "`password`",
  );
  assertEquals(noId.calls.length + noPassword.calls.length, 0);
});
