import { assertEquals, assertRejects } from "@std/assert";
import customerAssignBot from "../../actions/customer-assign-bot.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-assign-bot: PUT /customers/42/assign_bot/5/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await customerAssignBot.execute(
    { "customerId": 42, "botId": 5, "launch": false, "node": "n1" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/assign_bot/5/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "launch": false,
    "node": "n1",
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("customer-assign-bot: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        customerAssignBot.execute(
          { "customerId": 42, "botId": 5, "launch": false, "node": "n1" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("customer-assign-bot: declares perform", () => {
  assertEquals(customerAssignBot.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
