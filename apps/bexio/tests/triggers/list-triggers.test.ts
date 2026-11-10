import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import new_invoice from "../../triggers/new-invoice.ts";
import new_or_updated_invoice from "../../triggers/new-or-updated-invoice.ts";
import new_order from "../../triggers/new-order.ts";
import new_or_updated_order from "../../triggers/new-or-updated-order.ts";
import new_quote from "../../triggers/new-quote.ts";
import new_or_updated_quote from "../../triggers/new-or-updated-quote.ts";
import new_project from "../../triggers/new-project.ts";
import new_article from "../../triggers/new-article.ts";
import new_timesheet from "../../triggers/new-timesheet.ts";
import new_or_updated_contact from "../../triggers/new-or-updated-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };

describe("new-invoice", () => {
  const trigger = new_invoice;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_invoice?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-or-updated-invoice", () => {
  const trigger = new_or_updated_invoice;
  const item = (id: number, updated_at = "t1") => ({ id, updated_at });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_invoice?order_by=updated_at_desc&limit=100&offset=0",
    );
  });

  test("an edited record (same id, new update stamp) is a new event", async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [item(1, "t1")] }]).ctx,
    );
    const edited = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [item(1, "t2"), item(2, "t1")] }]).ctx,
    );
    assertEquals(edited.events, [item(2, "t1"), item(1, "t2")]);
  });
});

describe("new-order", () => {
  const trigger = new_order;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_order?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-or-updated-order", () => {
  const trigger = new_or_updated_order;
  const item = (id: number, updated_at = "t1") => ({ id, updated_at });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_order?order_by=updated_at_desc&limit=100&offset=0",
    );
  });

  test("an edited record (same id, new update stamp) is a new event", async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [item(1, "t1")] }]).ctx,
    );
    const edited = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [item(1, "t2"), item(2, "t1")] }]).ctx,
    );
    assertEquals(edited.events, [item(2, "t1"), item(1, "t2")]);
  });
});

describe("new-quote", () => {
  const trigger = new_quote;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_offer?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-or-updated-quote", () => {
  const trigger = new_or_updated_quote;
  const item = (id: number, updated_at = "t1") => ({ id, updated_at });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/kb_offer?order_by=updated_at_desc&limit=100&offset=0",
    );
  });

  test("an edited record (same id, new update stamp) is a new event", async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [item(1, "t1")] }]).ctx,
    );
    const edited = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [item(1, "t2"), item(2, "t1")] }]).ctx,
    );
    assertEquals(edited.events, [item(2, "t1"), item(1, "t2")]);
  });
});

describe("new-project", () => {
  const trigger = new_project;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/pr_project?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-article", () => {
  const trigger = new_article;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/article?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-timesheet", () => {
  const trigger = new_timesheet;
  const item = (id: number) => ({ id });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/timesheet?order_by=id_desc&limit=100&offset=0",
    );
  });
});

describe("new-or-updated-contact", () => {
  const trigger = new_or_updated_contact;
  const item = (id: number, updated_at = "t1") => ({ id, updated_at });
  const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item(2), item(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  });

  test("requests the newest-first order the list action sends", async () => {
    const seed = ctx([item(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://api.bexio.com/2.0/contact?order_by=updated_at_desc&limit=100&offset=0",
    );
  });

  test("an edited record (same id, new update stamp) is a new event", async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: [item(1, "t1")] }]).ctx,
    );
    const edited = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [item(1, "t2"), item(2, "t1")] }]).ctx,
    );
    assertEquals(edited.events, [item(2, "t1"), item(1, "t2")]);
  });
});
