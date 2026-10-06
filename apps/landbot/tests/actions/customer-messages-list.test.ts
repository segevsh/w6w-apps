import { assertEquals, assertRejects } from "@std/assert";
import customerMessagesList from "../../actions/customer-messages-list.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-messages-list: GET /customers/42/messages/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "success": true,
      "messages": [{ "type": "text", "message": "hi", "message_datetime": "2026-10-06 10:00:00" }],
    },
  }]);
  const out = await customerMessagesList.execute({ "customerId": 42 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/messages/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, {
    "messages": [{ "type": "text", "message": "hi", "message_datetime": "2026-10-06 10:00:00" }],
    "count": 1,
  });
});

Deno.test("customer-messages-list: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerMessagesList.execute({ "customerId": 42 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("customer-messages-list: declares read", () => {
  assertEquals(customerMessagesList.type, "read");
  assertEquals(detailBody("x"), { detail: "x" });
});
