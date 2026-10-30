import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import itemCreate from "../../actions/item-create.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CREATED = { item_id: 9, title: "Acme Ltd" };

test("item-create: POSTs the fields map to the app's item collection", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await itemCreate.execute({ appId: "123", fields: { title: "Acme Ltd" } }, ctx);
  assertEquals(out, { itemId: 9, title: "Acme Ltd" });
  assertEquals(pathOf(calls[0].url), "/item/app/123/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { fields: { title: "Acme Ltd" } });
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * All four value forms Podio documents per field must pass through untouched —
 * scalar, sub_id object, array of scalars, array of sub_id objects. Normalising
 * any of them would be this app inventing a shape the vendor did not.
 */
test("item-create: passes all four documented value forms through verbatim", async () => {
  const fields = {
    title: "Acme Ltd",
    amount: { value: "500.00", currency: "USD" },
    related: [12345, 67890],
    status: [{ value: 11 }, { value: 12 }],
  };
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await itemCreate.execute({ appId: "1", fields }, ctx);
  assertEquals(bodyOf(calls[0]).fields, fields);
});

test("item-create: fields may arrive as a typed JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await itemCreate.execute({ appId: "1", fields: '{"title":"Acme"}' }, ctx);
  assertEquals(bodyOf(calls[0]).fields, { title: "Acme" });
});

/**
 * The silent failure this guards: Podio ignores a `fields` value it cannot read
 * as a keyed map, so an array would produce a 200 that wrote nothing.
 */
test("item-create: an array of fields is refused before the request, not by Podio", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(itemCreate.execute({ appId: "1", fields: "[1,2]" }, ctx)),
    Error,
    "must be a JSON object keyed by field id or external id",
  );
  assertEquals(calls.length, 0);
});

test("item-create: missing fields fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(itemCreate.execute({ appId: "1", fields: undefined }, ctx)),
    Error,
    "Field values is required",
  );
  assertEquals(calls.length, 0);
});

test("item-create: optional body fields map to their documented snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await itemCreate.execute({
    appId: "1",
    fields: { title: "x" },
    externalId: "crm-88",
    tags: "a, b",
    fileIds: "[123456]",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    fields: { title: "x" },
    external_id: "crm-88",
    tags: ["a", "b"],
    file_ids: [123456],
  });
});

test("item-create: the webhook and stream switches reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await itemCreate.execute({ appId: "1", fields: { a: 1 }, hook: false, silent: true }, ctx);
  assertEquals(queryOf(calls[0].url), { hook: "false", silent: "true" });
});

/**
 * Podio's create endpoint accepts no idempotency key of any kind, so a retry
 * makes a duplicate. Marking it retryable would turn one dropped connection
 * into two records.
 */
test("item-create: is declared non-idempotent, because a retry duplicates the item", () => {
  assertEquals(itemCreate.idempotent, false);
  assertEquals(itemCreate.type, "perform");
});

test("item-create: logs the write without logging the values", async () => {
  const { ctx, logs } = mockCtx([{ body: CREATED }]);
  await itemCreate.execute({ appId: "123", fields: { secretish: "personal data" } }, ctx);
  assertEquals(logs.length, 1);
  assertEquals(logs[0].data, { appId: "123" });
  assert(!JSON.stringify(logs).includes("personal data"), "field values were written to the log");
});
