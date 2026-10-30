import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import meterReadingsAdd from "../../actions/meter-readings-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("meter-readings-add: uses the BATCH endpoint POST /v1/meterreadings", async () => {
  const stored = [{ meterId: 12, value: 340.5, createdAt: "2026-10-06T08:00:00.000Z" }];
  const { ctx, calls } = mockCtx([{ status: 201, body: stored }]);
  const out = await meterReadingsAdd.execute(
    { readings: '[{"meterId":12,"value":340.5,"readingDate":"2026-10-06T08:00:00.000Z"}]' },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/meterreadings");
  assertEquals(bodyOf(calls[0]) as unknown, [
    { meterId: 12, value: 340.5, readingDate: "2026-10-06T08:00:00.000Z" },
  ]);
  assertEquals(out, { readings: stored });
});

test("meter-readings-add: validates the array before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => meterReadingsAdd.execute({ readings: "[]" }, ctx) as Promise<unknown>,
    Error,
    "non-empty",
  );
  await assertRejects(
    () =>
      meterReadingsAdd.execute(
        { readings: [{ meterId: 1, value: "x" as unknown as number }] },
        ctx,
      ) as Promise<unknown>,
    Error,
    "readings[0]",
  );
  assertEquals(calls.length, 0);
});
