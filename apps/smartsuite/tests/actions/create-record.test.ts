import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-record.ts";

Deno.test("create-record: the record object IS the body — not nested under `fields`", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1" } }]);
  const result = await action.execute!(
    { tableId: "tbl1", fields: { s5f6a1b2c: "Jane", status: "Active" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { s5f6a1b2c: "Jane", status: "Active" });
  assertEquals(result, { id: "rec1" });
});

Deno.test("create-record: surfaces a 422 body as the thrown error detail", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: { status: "required" } } }]);
  let message = "";
  try {
    await action.execute!({ tableId: "tbl1", fields: {} }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("422"), true);
  assertEquals(message.includes("required"), true);
});

Deno.test("create-record: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
