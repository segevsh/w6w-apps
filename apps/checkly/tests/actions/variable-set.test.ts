import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-set.ts";

Deno.test("variable-set: updates in place when the variable exists", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { key: "BASE_URL" } }]);
  const result = await action.execute!({ key: "BASE_URL", value: "https://x.com" }, ctx) as {
    created: boolean;
  };
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/variables/BASE_URL");
  assertEquals(result.created, false);
  // Only the key is logged — the value is the whole point of the call.
  assert(!JSON.stringify(logs).includes("https://x.com"), "the value reached a log line");
});

/** A re-run of a deploy workflow must not fail on a variable that exists. */
Deno.test("variable-set: falls back to creating when the update 404s", async () => {
  const { ctx, calls } = mockCtx([
    { status: 404, body: { message: "not found" } },
    { status: 201, body: { key: "BASE_URL" } },
  ]);
  const result = await action.execute!({ key: "BASE_URL", value: "v" }, ctx) as {
    created: boolean;
  };
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://api.checklyhq.com/v1/variables");
  assertEquals(JSON.parse(calls[1].body!).key, "BASE_URL");
  assertEquals(result.created, true);
});

/** Any other failure is real and must not be swallowed by the fallback. */
Deno.test("variable-set: a non-404 failure is raised, not retried as a create", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { message: "forbidden" } }]);
  await assertRejects(
    async () => await action.execute!({ key: "K", value: "v" }, ctx),
    Error,
    "403",
  );
  assertEquals(calls.length, 1);
});

Deno.test("variable-set: secret and locked reach the wire as booleans", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ key: "K", value: "v", secret: true, locked: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals([body.secret, body.locked], [true, true]);
});

Deno.test("variable-set: the secret hint warns that it is one-way", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "secret")!;
  assert(param.hint!.includes("never read back"), param.hint);
});

Deno.test("variable-set: key and value are both required, before any request", async () => {
  const noKey = mockCtx([]);
  await assertRejects(async () => await action.execute!({ value: "v" }, noKey.ctx), Error, "`key`");
  const noValue = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ key: "K" }, noValue.ctx),
    Error,
    "`value`",
  );
  assertEquals(noKey.calls.length + noValue.calls.length, 0);
});
