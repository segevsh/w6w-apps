import { assertEquals } from "@std/assert";
import invoiceCreate from "../../actions/invoice-create.ts";
import { alegraError, assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const ITEMS = [{ id: "1", price: 120, quantity: 5, tax: [{ id: "6" }] }];

Deno.test("invoice-create: POST /invoices with client/numbering/seller as {id} references", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "77", status: "draft" } }]);
  const out = await invoiceCreate.execute({
    date: "2026-10-01",
    dueDate: "2026-10-31",
    clientId: "2",
    items: ITEMS,
    status: "open",
    anotation: "pay soon",
    numberTemplateId: "9",
    sellerId: "4",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/invoices");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    date: "2026-10-01",
    dueDate: "2026-10-31",
    status: "open",
    anotation: "pay soon",
    client: { id: "2" },
    numberTemplate: { id: "9" },
    seller: { id: "4" },
    items: ITEMS,
  });
  assertEquals(out, { id: "77", status: "draft" });
});

Deno.test("invoice-create: items given as JSON text are parsed; omitted optionals are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await invoiceCreate.execute({
    date: "2026-10-01",
    dueDate: "2026-10-01",
    clientId: "2",
    items: JSON.stringify(ITEMS),
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.items, ITEMS);
  assertEquals(Object.keys(body).sort(), ["client", "date", "dueDate", "items"]);
});

Deno.test("invoice-create: additionalFields are merged and win over the named fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await invoiceCreate.execute({
    date: "2026-10-01",
    dueDate: "2026-10-01",
    clientId: "2",
    items: ITEMS,
    additionalFields: { stamp: { generateStamp: true }, status: "draft" },
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.stamp, { generateStamp: true });
  assertEquals(body.status, "draft");
});

Deno.test("invoice-create: empty or non-array items fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const base = { date: "2026-10-01", dueDate: "2026-10-01", clientId: "2" };
  await assertRejects(() => invoiceCreate.execute({ ...base, items: [] }, ctx), Error, "non-empty");
  await assertRejects(
    () => invoiceCreate.execute({ ...base, items: "{}" }, ctx),
    Error,
    "JSON array",
  );
  await assertRejects(
    () => invoiceCreate.execute({ ...base, items: "nope" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("invoice-create: a 400 surfaces Alegra's wording", async () => {
  const { ctx } = mockCtx([{ status: 400, body: alegraError(400, "invalid model") }]);
  await assertRejects(
    () => invoiceCreate.execute({ date: "d", dueDate: "d", clientId: "2", items: ITEMS }, ctx),
    Error,
    "invalid model (code 400)",
  );
});
