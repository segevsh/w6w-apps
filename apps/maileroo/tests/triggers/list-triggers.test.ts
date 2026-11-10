import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newVerification from "../../triggers/new-verification.ts";
import newEmailLog from "../../triggers/new-email-log.ts";
import newTemplate from "../../triggers/new-template.ts";

const input = { params: {}, subscriptionId: "sub-1" };

describe("new-verification (newest first)", () => {
  const page = (items: unknown[]) => ({
    body: { data: { items, next_cursor: null, total: items.length } },
  });
  test("seeds, requests the literal page, emits only the new verification, retries", async () => {
    const seed = mockCtx([page([{ id: "vrf_1" }])]);
    const seeded = await newVerification.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, "https://api.maileroo.com/v1/verify/verifications?limit=100");
    const responses = [page([{ id: "vrf_2" }, { id: "vrf_1" }])];
    const first = await newVerification.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(responses).ctx,
    );
    const retry = await newVerification.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(responses).ctx,
    );
    assertEquals(first.events, [{ id: "vrf_2" }]);
    assertEquals(retry, first);
  });
});

describe("new-email-log (newest first)", () => {
  const page = (items: unknown[]) => ({ body: { data: { items, page: 1, has_more: false } } });
  test("seeds, posts the literal search, emits only the new message, retries", async () => {
    const seed = mockCtx([page([{ message_id: "<m1@example.com>" }])]);
    const seeded = await newEmailLog.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://api.maileroo.com/v1/logs/search");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { filters: {}, page: 1 });
    const responses = [
      page([{ message_id: "<m2@example.com>" }, { message_id: "<m1@example.com>" }]),
    ];
    const first = await newEmailLog.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(responses).ctx,
    );
    const retry = await newEmailLog.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(responses).ctx,
    );
    assertEquals(first.events, [{ message_id: "<m2@example.com>" }]);
    assertEquals(retry, first);
  });
});

describe("new-template (snapshot)", () => {
  const list = (...ids: string[]) => ({
    body: { data: ids.map((id) => ({ id, type: "html", template_name: `Name ${id}` })) },
  });
  test("seeds, requests the literal list, emits only the added template, retries", async () => {
    const seed = mockCtx([list("t1")]);
    const seeded = await newTemplate.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, "https://api.maileroo.com/v1/templates");
    const first = await newTemplate.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([list("t1", "t2")]).ctx,
    );
    const retry = await newTemplate.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([list("t1", "t2")]).ctx,
    );
    assertEquals(first.events, [{ id: "t2", type: "html", template_name: "Name t2" }]);
    assertEquals(retry, first);
    // A rename is not a new template.
    const renamed = await newTemplate.poll!(
      { ...input, state: first.nextState },
      mockCtx([{ body: { data: [{ id: "t1", template_name: "Other" }, { id: "t2" }] } }]).ctx,
    );
    assertEquals(renamed.events, []);
  });
});
