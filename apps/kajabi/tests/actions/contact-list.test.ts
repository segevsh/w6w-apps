import { assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: maps the surfaced filters to their bracketed names", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contacts") }]);
  await contactList.execute({
    siteId: "111",
    search: "alexa",
    nameContains: "al",
    emailContains: "@x.com",
    createdInLast: 30,
    hasOfferId: "5",
    hasProductId: "6",
    hasActiveProductId: "7",
    sort: "-created_at",
    pageNumber: 2,
    pageSize: 50,
    fields: "name,email",
  }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contacts");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[search]"], "alexa");
  assertEquals(q["filter[name_contains]"], "al");
  assertEquals(q["filter[email_contains]"], "@x.com");
  assertEquals(q["filter[created_in_last]"], "30");
  assertEquals(q["filter[has_offer_id]"], "5");
  assertEquals(q["filter[has_product_id]"], "6");
  assertEquals(q["filter[has_active_product_id]"], "7");
  assertEquals(q["sort"], "-created_at");
  assertEquals(q["page[number]"], "2");
  assertEquals(q["page[size]"], "50");
  assertEquals(q["fields[contacts]"], "name,email");
});

/**
 * Kajabi documents 75+ filters on this collection. The escape hatch is what
 * makes the ones this app does not surface reachable at all — see
 * `extraFilters` in `lib/client.ts`.
 */
Deno.test("contact-list: forwards additional documented filters through the escape hatch", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contacts") }]);
  await contactList.execute(
    { filters: '{"never_subscribed": true, "net_revenue_greater_than": 100}' },
    ctx,
  );
  const q = queryOf(calls[0]);
  assertEquals(q["filter[never_subscribed]"], "true");
  assertEquals(q["filter[net_revenue_greater_than]"], "100");
});

/** A surfaced param must win over the same key supplied through the hatch. */
Deno.test("contact-list: a real param overrides the same filter from the escape hatch", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contacts") }]);
  await contactList.execute(
    { siteId: "111", filters: '{"site_id": "999"}' },
    ctx,
  );
  assertEquals(queryOf(calls[0])["filter[site_id]"], "111");
});

Deno.test("contact-list: an injection-shaped filter key is rejected before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactList.execute({ filters: '{"a]&b[c": "x"}' }, ctx);
    },
    Error,
    "not a valid Kajabi filter name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contacts") }]);
  await contactList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});

/**
 * Regression: an UNSET named param must not shadow the same filter supplied
 * through the escape hatch.
 *
 * Object spread overwrites by key, not by definedness — so
 * `{ ...extraFilters(...), "filter[x]": undefined }` would leave the key
 * present-but-undefined, and the client would then drop it entirely. The filter
 * the author asked for would vanish, and it would vanish *silently*: an
 * unfiltered result set rather than an error. `definedQuery` in `lib/client.ts`
 * is what prevents it.
 */
Deno.test("contact-list: an unset named param does not shadow the same hatch filter", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contacts") }]);
  await contactList.execute({ filters: '{"has_tag_id": "42"}' }, ctx);
  assertEquals(queryOf(calls[0])["filter[has_tag_id]"], "42");
});
