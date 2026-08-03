import { assertEquals } from "@std/assert";
import action from "../../actions/list-contacts.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-contacts: GETs /contacts/v4/contacts with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/contacts/v4/contacts");
  assertEquals(url.search, "");
});

Deno.test("list-contacts: repeats `fields` rather than comma-joining, as Wix's examples do", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ fields: "source, info.name,info.emails" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.getAll("fields"), ["source", "info.name", "info.emails"]);
});

Deno.test("list-contacts: repeats `fieldsets` the same way", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ fieldsets: "BASIC,COMMUNICATION_DETAILS" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("fieldsets"),
    ["BASIC", "COMMUNICATION_DETAILS"],
  );
});

Deno.test("list-contacts: forwards paging and sort as dotted params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { limit: 5, offset: 10, sortFieldName: "info.name.last", sortOrder: "ASC" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("paging.limit"), "5");
  assertEquals(p.get("paging.offset"), "10");
  assertEquals(p.get("sort.fieldName"), "info.name.last");
  assertEquals(p.get("sort.order"), "ASC");
});

Deno.test("list-contacts: is a search action returning the body", async () => {
  const body = { contacts: [{ id: "1" }], pagingMetadata: { count: 1 } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
  assertEquals(action.type, "search");
});
