import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

const input = {
  "first_name": "v-first_name",
  "last_name": "v-last_name",
  "mobile": "v-mobile",
  "mobile_code_country": "v-mobile_code_country",
  "email": "v-email",
  "gender": "male",
  "birthday": "v-birthday",
  "groups": [1, 2],
  "additionalFields": { "extra_field": "x" },
} as never;

Deno.test("customer-create: POST /customers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { "status": 201, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/customers");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "first_name": "v-first_name",
    "last_name": "v-last_name",
    "mobile": "v-mobile",
    "mobile_code_country": "v-mobile_code_country",
    "email": "v-email",
    "gender": "male",
    "birthday": "v-birthday",
    "groups": [1, 2],
    "extra_field": "x",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { "status": 201, "success": true, "data": { "id": 1 } });
});

Deno.test("customer-create: sends only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!(
    {
      "first_name": "v-first_name",
      "last_name": "v-last_name",
      "mobile": "v-mobile",
      "mobile_code_country": "v-mobile_code_country",
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "first_name": "v-first_name",
    "last_name": "v-last_name",
    "mobile": "v-mobile",
    "mobile_code_country": "v-mobile_code_country",
  });
});

Deno.test("customer-create: a Salla error envelope throws with its message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      status: 422,
      success: false,
      error: { code: "error", message: "alert.invalid_fields", fields: { name: ["required"] } },
    },
  }]);
  let message = "";
  try {
    await action.execute!(input, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("alert.invalid_fields"), message);
  assert(message.includes("name: required"), message);
});
