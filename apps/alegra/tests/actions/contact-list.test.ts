import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { assertRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GET /contacts with paging, filters and metadata, normalised to items + total", async () => {
  const rows = [{ id: "1" }, { id: "2" }];
  const { ctx, calls } = mockCtx([{ body: { metadata: { total: 42 }, data: rows } }]);
  const out = await contactList.execute(
    { start: 30, limit: 10, orderDirection: "DESC", orderField: "id", query: "abc" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts");
  const q = queryOf(calls[0].url);
  assertEquals(q.start, "30");
  assertEquals(q.limit, "10");
  assertEquals(q.order_direction, "DESC");
  assertEquals(q.order_field, "id");
  assertEquals(q.query, "abc");
  assertEquals(q.metadata, "true");
  assertEquals(out, { items: rows, total: 42 });
});

Deno.test("contact-list: a bare array body still yields items with a null total", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "9" }] }]);
  assertEquals(await contactList.execute({}, ctx), { items: [{ id: "9" }], total: null });
});

Deno.test("contact-list: a limit above 30 is rejected locally and no request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => contactList.execute({ limit: 31 }, ctx), Error, "limit must be");
  assertEquals(calls.length, 0);
});

Deno.test("contact-list: a vendor error surfaces the vendor's own wording", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "limit too large", code: 400 } }]);
  await assertRejects(() => contactList.execute({}, ctx), Error, "limit too large");
});

Deno.test("contact-list: declares search type and a 30-capped limit param", () => {
  assertEquals(contactList.type, "search");
  const limit = contactList.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.validation?.max, 30);
});
