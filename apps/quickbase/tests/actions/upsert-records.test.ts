import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/upsert-records.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("upsert-records: posts to /records with `to` and field-id-keyed rows", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { metadata: {} } }]);
  await action.execute({ tableId: "bck1", data: [{ "6": { value: "Acme" } }] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/records");
  assertEquals(body(calls[0].body), { to: "bck1", data: [{ "6": { value: "Acme" } }] });
});

Deno.test("upsert-records: forwards mergeFieldId and fieldsToReturn", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { metadata: {} } }]);
  await action.execute({
    tableId: "bck1",
    data: '[{"7":{"value":"a@b.com"}}]',
    mergeFieldId: 7,
    fieldsToReturn: "[6,7]",
  }, ctx);

  assertEquals(body(calls[0].body).mergeFieldId, 7);
  assertEquals(body(calls[0].body).fieldsToReturn, [6, 7]);
});

Deno.test("upsert-records: a clean 200 reports partialFailure false", async () => {
  const { ctx, logs } = mockQbCtx([{
    body: {
      data: [{ "3": { value: 11 } }],
      metadata: { createdRecordIds: [11], updatedRecordIds: [], totalNumberOfRecordsProcessed: 1 },
    },
  }]);
  const out = await action.execute({ tableId: "bck1", data: [{ "6": { value: "x" } }] }, ctx);

  assertEquals(out.partialFailure, false);
  assertEquals(out.metadata!.createdRecordIds, [11]);
  assertEquals(logs.length, 0);
});

Deno.test("upsert-records: HTTP 207 partial write is surfaced, not swallowed", async () => {
  // 207 is a 2xx, so a client that only checks `res.ok` would report success
  // while dropping rows. This is the regression that test exists for.
  const { ctx, logs } = mockQbCtx([{
    status: 207,
    body: {
      data: [],
      metadata: {
        createdRecordIds: [11, 12],
        lineErrors: { "2": ['Incompatible value for field with ID "6".'] },
        totalNumberOfRecordsProcessed: 3,
        unchangedRecordIds: [],
        updatedRecordIds: [],
      },
    },
  }]);
  const out = await action.execute({ tableId: "bck1", data: [{}, {}, {}] }, ctx);

  assertEquals(out.partialFailure, true);
  // The rows that DID land are still reported — turning a partial write into an
  // exception would strand them with no record of what succeeded.
  assertEquals(out.metadata!.createdRecordIds, [11, 12]);
  assertEquals(out.metadata!.lineErrors!["2"].length, 1);

  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("1 of 3"));
});

Deno.test("upsert-records: lineErrors on a plain 200 also counts as partial failure", async () => {
  const { ctx } = mockQbCtx([{
    body: { metadata: { createdRecordIds: [11], lineErrors: { "2": ["bad"] } } },
  }]);
  const out = await action.execute({ tableId: "bck1", data: [{}] }, ctx);
  assertEquals(out.partialFailure, true);
});

Deno.test("upsert-records: rejects a missing/blank record payload before calling", async () => {
  const { ctx, calls } = mockQbCtx([]);
  let threw = false;
  try {
    await action.execute({ tableId: "bck1", data: "" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
