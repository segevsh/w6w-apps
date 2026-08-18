import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("item-get: reads the Item", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { item: { item_id: "i1" } } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/item/get");
});

/** An expired login is otherwise indistinguishable from a quiet account. */
Deno.test("item-get: an Item error is surfaced as a warning", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { item: { item_id: "i1", error: { error_code: "ITEM_LOGIN_REQUIRED" } } },
  }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /error state/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("item-get: a healthy Item logs nothing alarming", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { item: { item_id: "i1" } } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("item-get: a missing token is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "accessToken");
});
