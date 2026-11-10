import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { linkHeader, mockCtx, queryOf } from "../_helpers.ts";
import newProgram from "../../triggers/new-program.ts";
import newAffiliateGroup from "../../triggers/new-affiliate-group.ts";
import newAffiliatePayment from "../../triggers/new-affiliate-payment.ts";
import newAffiliateProgram from "../../triggers/new-affiliate-program.ts";
import newProgramAffiliate from "../../triggers/new-program-affiliate.ts";
import newAffiliate from "../../triggers/new-affiliate.ts";

const JSON_H = { "content-type": "application/json" };
const ids = (events: unknown[]) => events.map((e) => (e as { id: string }).id);

// Table-driven: the bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  {
    name: "new-program",
    trigger: newProgram,
    params: {},
    url: "https://api.tapfiliate.com/1.6/programs/",
    old: [{ id: "alpha-program" }, { id: "beta-program" }],
    fresh: { id: "gamma-program", title: "Gamma" },
  },
  {
    name: "new-affiliate-group",
    trigger: newAffiliateGroup,
    params: {},
    url: "https://api.tapfiliate.com/1.6/affiliate-groups/",
    old: [{ id: "ag_one", title: "One" }],
    fresh: { id: "ag_two", title: "Two", affiliate_count: 0 },
  },
  {
    name: "new-affiliate-payment",
    trigger: newAffiliatePayment,
    params: { affiliateId: "u_JaN3-J0n" },
    url: "https://api.tapfiliate.com/1.6/affiliates/u_JaN3-J0n/payments/",
    old: [{ id: "pa_one", amount: 10 }],
    fresh: { id: "pa_two", amount: 50, currency: "USD" },
  },
  {
    name: "new-affiliate-program",
    trigger: newAffiliateProgram,
    params: { affiliateId: "u_JaN3-J0n" },
    url: "https://api.tapfiliate.com/1.6/affiliates/u_JaN3-J0n/programs/",
    old: [{ id: "alpha-program", approved: true }],
    fresh: { id: "beta-program", approved: false },
  },
  {
    name: "new-program-affiliate",
    trigger: newProgramAffiliate,
    params: { programId: "john-s-program" },
    url: "https://api.tapfiliate.com/1.6/programs/john-s-program/affiliates/",
    old: [{ id: "aff_one", email: "one@example.com" }],
    fresh: { id: "aff_two", email: "two@example.com" },
  },
  {
    name: "new-affiliate",
    trigger: newAffiliate,
    params: {},
    url: "https://api.tapfiliate.com/1.6/affiliates/",
    old: [{ id: "aff_one", email: "one@example.com" }],
    fresh: { id: "aff_two", email: "two@example.com" },
  },
];

for (const { name, trigger, params, url, old, fresh } of specs) {
  const input = { params, subscriptionId: "sub-1" };

  test(`${name} seeds without events, then emits only the new record`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: old }]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const next = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [...old, fresh] }]).ctx,
    );
    assertEquals(next.events, [fresh]);
  });

  test(`${name} is idempotent: the same state and response give the same result`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: old }]).ctx);
    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: [...old, fresh] }]).ctx,
      );
    assertEquals(await run(), await run());
  });

  test(`${name} makes the literal request of its list action`, async () => {
    const m = mockCtx([{ body: old }]);
    await trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, url);
  });

  test(`${name} does not re-emit a record that was already seen`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: old }]).ctx);
    const again = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: old }]).ctx,
    );
    assertEquals(again.events, []);
  });
}

test("new-program follows the Link header to the next page and sees a program found there", async () => {
  const seeded = await newProgram.poll!(
    { params: {}, subscriptionId: "sub-1", state: {} },
    mockCtx([
      { body: [{ id: "p1" }], headers: { ...JSON_H, link: linkHeader(2, "/1.6/programs/") } },
      { body: [{ id: "p2" }] },
    ]).ctx,
  );
  assertEquals(seeded.events, []);
  const m = mockCtx([
    { body: [{ id: "p1" }], headers: { ...JSON_H, link: linkHeader(2, "/1.6/programs/") } },
    { body: [{ id: "p2" }, { id: "p3" }] },
  ]);
  const next = await newProgram.poll!(
    { params: {}, subscriptionId: "sub-1", state: seeded.nextState },
    m.ctx,
  );
  assertEquals(ids(next.events), ["p3"]);
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[0].url, "https://api.tapfiliate.com/1.6/programs/");
  assertEquals(queryOf(m.calls[1].url), { page: "2" });
});

for (
  const [name, trigger, params, path] of [
    [
      "new-program-affiliate",
      newProgramAffiliate,
      { programId: "p1" },
      "/1.6/programs/p1/affiliates/",
    ],
    ["new-affiliate", newAffiliate, {}, "/1.6/affiliates/"],
  ] as const
) {
  test(`${name} follows the Link header to a second page and sees an affiliate found there`, async () => {
    const link = { ...JSON_H, link: linkHeader(2, path) };
    const seeded = await trigger.poll!(
      { params, subscriptionId: "sub-1", state: {} },
      mockCtx([{ body: [{ id: "a1" }], headers: link }, { body: [{ id: "a2" }] }]).ctx,
    );
    assertEquals(seeded.events, []);
    const m = mockCtx([
      { body: [{ id: "a1" }], headers: link },
      { body: [{ id: "a2" }, { id: "a3" }] },
    ]);
    const next = await trigger.poll!(
      { params, subscriptionId: "sub-1", state: seeded.nextState },
      m.ctx,
    );
    assertEquals(ids(next.events), ["a3"]);
    assertEquals(m.calls.length, 2);
    assertEquals(queryOf(m.calls[1].url), { page: "2" });
  });
}
