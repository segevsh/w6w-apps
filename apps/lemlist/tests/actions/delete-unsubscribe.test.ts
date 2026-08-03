import { assert, assertEquals } from "@std/assert";
import deleteUnsubscribe from "../../actions/delete-unsubscribe.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-unsubscribe: DELETEs the v2 variables route", async () => {
  const { ctx, calls } = mockCtx([{ body: "Variable subscribed" }]);
  await deleteUnsubscribe.execute!({ value: "john.doe@example.com" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v2/unsubscribes/variables/john.doe%40example.com",
  );
});

Deno.test("delete-unsubscribe: returns lemlist's bare-string confirmation, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "Variable subscribed" }]);
  assertEquals(await deleteUnsubscribe.execute!({ value: "a@b.com" }, ctx), "Variable subscribed");
});

Deno.test("delete-unsubscribe: surfaces the 409 for a protected lead/abuse opt-out", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    statusText: "Conflict",
    body: "Variable is protected and cannot be re-subscribed",
  }]);
  const err = await Promise.resolve(deleteUnsubscribe.execute!({ value: "a@b.com" }, ctx))
    .catch((e: unknown) => e);
  assert(err instanceof Error);
  assert(err.message.includes("409"));
  assert(err.message.includes("protected"));
});

Deno.test("delete-unsubscribe: surfaces the 400 for a value that was never unsubscribed", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: "Variable not found in unsubscribe list",
  }]);
  const err = await Promise.resolve(deleteUnsubscribe.execute!({ value: "a@b.com" }, ctx))
    .catch((e: unknown) => e);
  assert(err instanceof Error);
  assert(err.message.includes("400"));
});
