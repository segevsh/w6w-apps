import { assertEquals, assertRejects } from "@std/assert";
import customerFind from "../../actions/customer-find.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

const LIST = {
  items: [{ id: "107", links: [] }, { id: "41", links: [] }],
  hasMore: false,
};

Deno.test("customer-find: builds the q filter, excludes inactive, then fetches each match", async () => {
  const { ctx, calls } = mockCtx([
    { body: LIST },
    { body: { links: [], companyName: "Glenrock", email: "alan@ns.com" } },
    { body: { links: [], companyName: "Other", email: "alan@ns.com" } },
  ]);
  const out = await run(customerFind, {
    email: "alan@ns.com",
    fields: "companyName,email",
    limit: 5,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), 'email IS "alan@ns.com" AND isinactive IS false');
  assertEquals(q.get("limit"), "5");
  assertEquals(
    calls[1].url,
    `${BASE}/services/rest/record/v1/customer/107?fields=companyName%2Cemail`,
  );
  assertEquals(out, {
    customers: [
      { id: "107", companyName: "Glenrock", email: "alan@ns.com" },
      { id: "41", companyName: "Other", email: "alan@ns.com" },
    ],
    count: 2,
    hasMore: false,
  });
});

Deno.test("customer-find: blank fields returns ids only, in one request", async () => {
  const { ctx, calls } = mockCtx([{ body: LIST }]);
  const out = await run(customerFind, {
    companyName: "Acme Corp",
    externalId: "X1",
    includeInactive: true,
    fields: "",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("q"),
    'companyname START_WITH "Acme Corp" AND externalId IS "X1"',
  );
  assertEquals(calls.length, 1);
  assertEquals(out.customers, [{ id: "107" }, { id: "41" }]);
});

Deno.test("customer-find: needs a criterion, and a quote in a value never reaches the filter", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await run(customerFind, {}, ctx), Error, "at least one");
  await assertRejects(
    async () => await run(customerFind, { email: 'a" OR 1=1' }, ctx),
    Error,
    "double quote",
  );
  assertEquals(calls.length, 0);
});
