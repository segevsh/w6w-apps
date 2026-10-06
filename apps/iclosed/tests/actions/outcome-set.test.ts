import { assertEquals } from "@std/assert";
import outcomeSet from "../../actions/outcome-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("outcome-set: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await outcomeSet.execute(
    {
      "eventCallId": 7,
      "outcome": "WON",
      "noSaleReason": "FOLLOW_UP_SCHEDULE",
      "notes": "x-notes",
      "objection": "MONEY",
      "newDeal": '{"value": 100, "transactionType": "WON"}',
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/outcomes");
  assertEquals(JSON.parse(calls[0].body!), {
    "eventCallId": 7,
    "outcome": "WON",
    "noSaleReason": "FOLLOW_UP_SCHEDULE",
    "notes": "x-notes",
    "objection": "MONEY",
    "newDeal": { "value": 100, "transactionType": "WON" },
  });
  assertEquals(out, REPLY);
});

Deno.test("outcome-set: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await outcomeSet.execute({ "eventCallId": 7, "outcome": "WON" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "eventCallId": 7, "outcome": "WON" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("outcome-set: declares a perform action's idempotency", () => {
  assertEquals(outcomeSet.type, "perform");
  assertEquals(outcomeSet.idempotent, true);
  assertEquals(outcomeSet.params!.filter((p) => p.required).map((p) => p.key), [
    "eventCallId",
    "outcome",
  ]);
});
