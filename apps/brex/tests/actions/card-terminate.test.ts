import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import cardTerminate from "../../actions/card-terminate.ts";
import { bodyOf, CARD, mockCtx, pathOf } from "../_helpers.ts";

const TERMINATED = { ...CARD, status: "TERMINATED" };

test("card-terminate: POSTs the required reason and an optional description", async () => {
  const { ctx, calls } = mockCtx([{ body: TERMINATED }]);
  const result = await cardTerminate.execute({
    id: "card_1",
    reason: "FRAUD",
    description: "Replaced after a fraud alert",
  }, ctx) as typeof TERMINATED;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/cards/card_1/terminate");
  assertEquals(bodyOf(calls[0]), {
    reason: "FRAUD",
    description: "Replaced after a fraud alert",
  });
  assertEquals(result.status, "TERMINATED");
});

test("card-terminate: the reason enum matches the lock endpoint's, per Brex", () => {
  const reason = cardTerminate.params?.find((p) => p.key === "reason");
  assertEquals(reason?.required, true);
  assertEquals((reason?.options as Array<{ value: string }>).length, 7);
});

test("card-terminate: with no description only the reason is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: TERMINATED }]);
  await cardTerminate.execute({ id: "card_1", reason: "CARD_DAMAGED" }, ctx);

  assertEquals(bodyOf(calls[0]), { reason: "CARD_DAMAGED" });
});

test("card-terminate: it is a perform declared idempotent", () => {
  assertEquals(cardTerminate.type, "perform");
  assertEquals(cardTerminate.idempotent, true);
});
