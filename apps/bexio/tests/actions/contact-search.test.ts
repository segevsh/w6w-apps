import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-search.ts";

Deno.test("contact-search: POSTs an array-of-criteria body to /2.0/contact/search", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name_1: "Meyer" }] }]);
  const result = await action.execute!({
    field: "name_1",
    value: "Meyer",
    criteria: "=",
    orderBy: "id",
    limit: 20,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("limit"), "20");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, [{ field: "name_1", value: "Meyer", criteria: "=" }]);
  assertEquals(result, [{ id: 1, name_1: "Meyer" }]);
});

Deno.test("contact-search: defaults criteria to undefined, letting the vendor's own default apply", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ field: "mail", value: "a@b.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, [{ field: "mail", value: "a@b.com" }]);
});
