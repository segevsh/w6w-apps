import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get-all.ts";

Deno.test("contact-get-all: no filter → GET /marketing/contacts, respects limit", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { result: [{ id: "1" }, { id: "2" }, { id: "3" }], _metadata: {} },
    },
  ]);
  const result = await action.execute!({ limit: 2 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts");
  assertEquals(result, [{ id: "1" }, { id: "2" }]);
});

Deno.test("contact-get-all: filter query → POST /marketing/contacts/search", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ id: "1" }], _metadata: {} } },
  ]);
  await action.execute!(
    { returnAll: true, filters: { query: "email LIKE '%@x.com'" } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts/search");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.query, "email LIKE '%@x.com'");
});

Deno.test("contact-get-all: follows _metadata.next pagination when returnAll", async () => {
  const nextUrl = "https://api.sendgrid.com/v3/marketing/contacts?page_token=xyz";
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ id: "1" }], _metadata: { next: nextUrl } } },
    { status: 200, body: { result: [{ id: "2" }], _metadata: {} } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx);

  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, nextUrl);
  assertEquals(result, [{ id: "1" }, { id: "2" }]);
});

Deno.test("contact-get-all: the SGQL query is a flat param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }]);
  await action.execute!({ query: "email LIKE '%@x.com'" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/contacts/search");
  assertEquals(JSON.parse(calls[0].body ?? "").query, "email LIKE '%@x.com'");
});

Deno.test("contact-get-all: a flat query wins over the deprecated filters group", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }]);
  await action.execute!({ query: "new", filters: { query: "old" } }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "").query, "new");
});

Deno.test("contact-get-all: no param is buried in a `group` the studio renders as JSON", () => {
  const walk = (list: typeof action.params): string[] =>
    (list ?? []).flatMap((p) => [...(p.type === "group" ? [p.key] : []), ...walk(p.children)]);
  assertEquals(walk(action.params), []);
});
