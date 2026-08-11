import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { API_ROOT, mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("customer-list: calls GET /customers and folds the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page("customers", [{ id: "c1" }]) }]);
  const out = await customerList.execute({ q: "ada@example.com", page: 1, pageSize: 50 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/customers`), true, calls[0].url);
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(queryOf(calls[0].url), { q: "ada@example.com", page: "1", page_size: "50" });
  assertEquals(out, { items: [{ id: "c1" }], page: 1, pageSize: 50, totalPages: 1, totalItems: 1 });
});

Deno.test("customer-list: expand is sent as repeated expand[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: page("customers", []) }]);
  await customerList.execute({ expand: ["attachments", "do_not_service"] }, ctx);

  assertEquals(queryAll(calls[0].url, "expand[]"), ["attachments", "do_not_service"]);
  assertEquals(queryAll(calls[0].url, "expand"), []);
});

Deno.test("customer-list: unset filters are omitted entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: page("customers", []) }]);
  await customerList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("customer-list: the location header is sent only when a location is given", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("customers", []) },
    { body: page("customers", []) },
  ]);
  await customerList.execute({}, ctx);
  await customerList.execute({ companyId: "loc-1" }, ctx);

  assertEquals(calls[0].headers["x-company-id"], undefined);
  assertEquals(calls[1].headers["x-company-id"], "loc-1");
});
