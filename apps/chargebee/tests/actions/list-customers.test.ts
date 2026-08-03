import { assertEquals } from "@std/assert";
import { connected, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-customers.ts";

const ok = { status: 200, body: { list: [], next_offset: undefined } };

Deno.test("list-customers: is a search action over the customer resource", () => {
  assertEquals(action.key, "list-customers");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "customer");
});

Deno.test("list-customers: GETs /customers on the connection's own site", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://acme.chargebee.com");
  assertEquals(url.pathname, "/api/v2/customers");
  assertEquals(url.search, "");
});

Deno.test("list-customers: sends filters in OPERATOR form, never as bare values", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    limit: 25,
    offset: "cursor-abc",
    email: "a@b.com",
    firstName: "John",
    lastName: "Doe",
    company: "Bluth",
    autoCollection: "off",
    includeDeleted: true,
  }, connected(ctx));

  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "25");
  assertEquals(q.get("offset"), "cursor-abc");
  assertEquals(q.get("include_deleted"), "true");
  assertEquals(q.get("email[is]"), "a@b.com");
  assertEquals(q.get("first_name[is]"), "John");
  assertEquals(q.get("last_name[is]"), "Doe");
  assertEquals(q.get("company[is]"), "Bluth");
  assertEquals(q.get("auto_collection[is]"), "off");
  // The bare forms would be different parameters Chargebee does not define.
  assertEquals(q.get("email"), null);
  assertEquals(q.get("auto_collection"), null);
});

Deno.test("list-customers: maps sort attribute + order onto sort_by[asc|desc]", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ sortAttribute: "updated_at", sortOrder: "desc" }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort_by[desc]"), "updated_at");
  assertEquals(q.get("sort_by[asc]"), null);
});

Deno.test("list-customers: sends no sort_by when no attribute is chosen", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ sortOrder: "desc" }, connected(ctx));
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-customers: offers only the two sort attributes this list documents", () => {
  assertEquals(optionValues(action, "sortAttribute"), ["created_at", "updated_at"]);
  assertEquals(optionValues(action, "autoCollection"), ["on", "off"]);
});

Deno.test("list-customers: returns Chargebee's list/next_offset envelope unchanged", async () => {
  const body = { list: [{ customer: { id: "c1" } }], next_offset: "[1517505731000,29000]" };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, connected(ctx)), body);
});
