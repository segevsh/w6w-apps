import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/entry-get-many.ts";

Deno.test("entry-get-many: with no form ID it GETs the site-wide /entries route", async () => {
  const { ctx, calls } = mockCtx([{ body: { total_count: 0, entries: [] } }], {
    display: DISPLAY,
  });
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries`);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("entry-get-many: a single form ID switches to the form-scoped route", async () => {
  const { ctx, calls } = mockCtx([{ body: { total_count: 0, entries: [] } }], {
    display: DISPLAY,
  });
  await action.execute!({ formId: 30 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/entries`);
});

Deno.test("entry-get-many: form IDs go out as the indexed form_ids array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formIds: [1, 2] }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("form_ids[0]"), "1");
  assertEquals(params.get("form_ids[1]"), "2");
});

Deno.test("entry-get-many: form_ids is dropped once the scoped route is used", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, formIds: [1, 2] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/entries`);
  assertEquals(paramsOf(calls).has("form_ids[0]"), false);
});

Deno.test("entry-get-many: paging and sorting use Gravity Forms' bracket sub-keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({
    pageSize: 20,
    currentPage: 3,
    offset: 40,
    sortingKey: "date_created",
    sortingDirection: "ASC",
    sortingIsNumeric: false,
  }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("paging[page_size]"), "20");
  assertEquals(params.get("paging[current_page]"), "3");
  assertEquals(params.get("paging[offset]"), "40");
  assertEquals(params.get("sorting[key]"), "date_created");
  assertEquals(params.get("sorting[direction]"), "ASC");
  // `false` must still be SENT — it is a meaningful sorting instruction, not an
  // absent one, so it is stringified rather than dropped as an empty value.
  assertEquals(params.get("sorting[is_numeric]"), "false");
});

Deno.test("entry-get-many: paging[offset]=0 survives (zero is a real offset)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ offset: 0 }, ctx);
  assertEquals(paramsOf(calls).get("paging[offset]"), "0");
});

Deno.test("entry-get-many: search is JSON-encoded into the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  const search = { field_filters: [{ key: "2", value: "test", operator: "contains" }] };
  await action.execute!({ search }, ctx);
  assertEquals(paramsOf(calls).get("search"), JSON.stringify(search));
});

Deno.test("entry-get-many: _labels is sent as 1 only when asked for", async () => {
  const on = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ labels: true }, on.ctx);
  assertEquals(paramsOf(on.calls).get("_labels"), "1");

  const off = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ labels: false }, off.ctx);
  assertEquals(paramsOf(off.calls).has("_labels"), false);
});

Deno.test("entry-get-many: _field_ids and include are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ fieldIds: "1.3,3", include: [10, 11] }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("_field_ids"), "1.3,3");
  assertEquals(params.get("include[0]"), "10");
  assertEquals(params.get("include[1]"), "11");
});

Deno.test("entry-get-many: returns the vendor envelope verbatim", async () => {
  const body = { total_count: 2, entries: [{ id: "1" }, { id: "2" }] };
  const { ctx } = mockCtx([{ body }], { display: DISPLAY });
  assertEquals(await action.execute!({}, ctx), body);
});

Deno.test("entry-get-many: is a search action against the entry resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "entry");
  assert(action.output);
});
