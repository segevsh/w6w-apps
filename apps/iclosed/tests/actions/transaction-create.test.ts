import { assertEquals } from "@std/assert";
import transactionCreate from "../../actions/transaction-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("transaction-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await transactionCreate.execute(
    {
      "value": 49.5,
      "name": "x-name",
      "email": "x-email",
      "phoneNumber": "x-phoneNumber",
      "description": "x-description",
      "source": "Zapier",
      "updatedBy": "x-updatedBy",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(JSON.parse(calls[0].body!), {
    "value": 49.5,
    "name": "x-name",
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "description": "x-description",
    "source": "Zapier",
    "updatedBy": "x-updatedBy",
  });
  assertEquals(out, REPLY);
});

Deno.test("transaction-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await transactionCreate.execute({ "value": 49.5 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "value": 49.5 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("transaction-create: declares a perform action's idempotency", () => {
  assertEquals(transactionCreate.type, "perform");
  assertEquals(transactionCreate.idempotent, false);
  assertEquals(transactionCreate.params!.filter((p) => p.required).map((p) => p.key), ["value"]);
});
