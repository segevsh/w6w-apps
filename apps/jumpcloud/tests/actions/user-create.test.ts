import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

const display = { display: { region: "us" } };

/** Staged is safer than activated for a workflow that provisions ahead of time. */
Deno.test("user-create: defaults to STAGED rather than a live account", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "u1" } }], display);
  await action.execute!({ username: "ada", email: "ada@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers");
  assertEquals(JSON.parse(calls[0].body!).state, "STAGED");
});

Deno.test("user-create: an explicit state wins", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ username: "ada", email: "a@x.com", state: "ACTIVATED" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).state, "ACTIVATED");
});

Deno.test("user-create: the password is sent but never logged", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ username: "ada", email: "a@x.com", password: "s3cret" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).password, "s3cret");
  assert(!JSON.stringify(logs).includes("s3cret"), "the password reached a log line");
});

Deno.test("user-create: username and email are both required, before any request", async () => {
  const noUser = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com" }, noUser.ctx),
    Error,
    "`username`",
  );
  const noEmail = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ username: "ada" }, noEmail.ctx),
    Error,
    "`email`",
  );
  assertEquals(noUser.calls.length + noEmail.calls.length, 0);
});

Deno.test("user-create: rejects a duplicate rather than deduping, and says so", () => {
  assertEquals(action.idempotent, false);
});
