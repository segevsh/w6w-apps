import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { API_ROOT, count, mockCtx, page, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /contacts and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, email: "a@b.c" }], { total: 340 }) }]);
  const out = await contactList.execute({ perPage: 100 }, ctx) as { total: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/contacts");
  assertEquals(queryOf(calls[0].url), { per_page: "100" });
  assertEquals(out.total, 340);
});

Deno.test("contact-list: the URL is built against api.sendfox.com", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({}, ctx);
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/contacts`), true, calls[0].url);
});

Deno.test("contact-list: prefills the vendor's own 100 per page", () => {
  const perPage = (contactList.params ?? []).find((p) => p.key === "perPage");
  assertEquals(perPage?.default, 100);
  assertEquals(perPage?.validation?.max, 1000);
});

Deno.test("contact-list: count_only returns {count, filter} and sends the flag", async () => {
  const { ctx, calls } = mockCtx([{ body: count(128, "filter: never_opened") }]);
  const out = await contactList.execute({ countOnly: true }, ctx) as { count: number };

  assertEquals(queryOf(calls[0].url), { count_only: "true" });
  assertEquals(out.count, 128);
});

Deno.test("contact-list: falsy booleans are sent as false, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({ unsubscribed: false, neverOpened: false }, ctx);

  assertEquals(queryOf(calls[0].url), {
    unsubscribed: "false",
    "filter[never_opened]": "false",
  });
});

Deno.test("contact-list: the filter grammar is mapped to SendFox's own bracket names", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute(
    {
      status: "inactive",
      lastOpenedBefore: "2026-01-01T00:00:00.000Z",
      lastClickedAfter: "2025-06-01T00:00:00.000Z",
      createdAfter: "2025-01-01T00:00:00.000Z",
      neverClicked: true,
    },
    ctx,
  );

  const q = queryOf(calls[0].url);
  assertEquals(q["filter[status]"], "inactive");
  assertEquals(q["filter[last_opened_before]"], "2026-01-01T00:00:00.000Z");
  assertEquals(q["filter[last_clicked_after]"], "2025-06-01T00:00:00.000Z");
  assertEquals(q["filter[created_after]"], "2025-01-01T00:00:00.000Z");
  assertEquals(q["filter[never_clicked]"], "true");
});

/**
 * The id filters are OpenAPI arrays in the default form/explode form, so they go
 * on the wire as a repeated key — never comma-joined, which Laravel would read as
 * one bad id.
 */
Deno.test("contact-list: id-array filters are sent as a repeated key", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({ inListIds: [1, 2], tagIds: [7] }, ctx);

  assertEquals(queryAllOf(calls[0].url, "filter[in_list_ids]"), ["1", "2"]);
  assertEquals(queryAllOf(calls[0].url, "filter[tag_ids]"), ["7"]);
  assertEquals(queryOf(calls[0].url)["filter[in_list_ids]"], "2");
});

Deno.test("contact-list: an empty id list and an empty search are omitted entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute({ inListIds: [], query: "" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
