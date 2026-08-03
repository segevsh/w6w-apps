import { assertEquals } from "@std/assert";
import action from "../../actions/create-custom-field.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-custom-field: POSTs the label to /v4/custom_fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { custom_field: { id: 1, label: "Last name", key: "last_name" } },
  }]);
  await action.execute!({ label: "Last name" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/custom_fields");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { label: "Last name" });
});

Deno.test("create-custom-field: is not idempotent — a duplicate label is a 422", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("create-custom-field: returns the custom_field envelope with Kit's derived key", async () => {
  const body = { custom_field: { id: 1, label: "Last name", key: "last_name" } };
  const { ctx } = mockCtx([{ status: 201, body }]);
  assertEquals(await action.execute!({ label: "Last name" }, ctx), body);
});
