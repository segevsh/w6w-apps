import { assertEquals } from "@std/assert";
import dealCreate from "../../actions/deal-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("deal-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await dealCreate.execute(
    {
      "eventCallId": 7,
      "productId": 7,
      "productName": "x-productName",
      "value": 49.5,
      "time": "x-time",
      "transactionType": "WON",
      "transactionIds": "[3, 4]",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/deals");
  assertEquals(JSON.parse(calls[0].body!), {
    "eventCallId": 7,
    "productId": 7,
    "productName": "x-productName",
    "value": 49.5,
    "time": "x-time",
    "transactionType": "WON",
    "transactionIds": [3, 4],
  });
  assertEquals(out, REPLY);
});

Deno.test("deal-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await dealCreate.execute({ "eventCallId": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "eventCallId": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("deal-create: declares a perform action's idempotency", () => {
  assertEquals(dealCreate.type, "perform");
  assertEquals(dealCreate.idempotent, false);
  assertEquals(dealCreate.params!.filter((p) => p.required).map((p) => p.key), ["eventCallId"]);
});
