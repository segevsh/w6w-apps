import { assertEquals } from "@std/assert";
import dealUpdate from "../../actions/deal-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("deal-update: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await dealUpdate.execute(
    {
      "id": 7,
      "value": 49.5,
      "recurring": true,
      "transactionType": "WON",
      "productId": 7,
      "closerId": 7,
      "time": "x-time",
      "transactionIds": "[3, 4]",
      "type": "DEAL",
      "email": "x-email",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/deals");
  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "value": 49.5,
    "recurring": true,
    "transactionType": "WON",
    "productId": 7,
    "closerId": 7,
    "time": "x-time",
    "transactionIds": [3, 4],
    "type": "DEAL",
    "email": "x-email",
  });
  assertEquals(out, REPLY);
});

Deno.test("deal-update: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await dealUpdate.execute({ "id": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("deal-update: declares a perform action's idempotency", () => {
  assertEquals(dealUpdate.type, "perform");
  assertEquals(dealUpdate.idempotent, true);
  assertEquals(dealUpdate.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
