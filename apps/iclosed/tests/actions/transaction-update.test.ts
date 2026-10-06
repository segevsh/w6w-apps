import { assertEquals } from "@std/assert";
import transactionUpdate from "../../actions/transaction-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("transaction-update: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await transactionUpdate.execute(
    {
      "id": 7,
      "name": "x-name",
      "email": "x-email",
      "phoneNumber": "x-phoneNumber",
      "description": "x-description",
      "value": 49.5,
      "source": "Zapier",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "name": "x-name",
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "description": "x-description",
    "value": 49.5,
    "source": "Zapier",
  });
  assertEquals(out, REPLY);
});

Deno.test("transaction-update: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await transactionUpdate.execute({ "id": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("transaction-update: declares a perform action's idempotency", () => {
  assertEquals(transactionUpdate.type, "perform");
  assertEquals(transactionUpdate.idempotent, true);
  assertEquals(transactionUpdate.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
