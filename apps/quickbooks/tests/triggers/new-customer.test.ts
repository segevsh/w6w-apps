import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockQuickBooksCtx([{ body }]);

test("new-customer: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ QueryResponse: { Customer: [{ Id: "a" }] } });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/query?minorversion=75&query=SELECT+*+FROM+Customer+ORDERBY+MetaData.CreateTime+DESC+STARTPOSITION+1+MAXRESULTS+100",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ QueryResponse: { Customer: [{ Id: "b" }, { Id: "a" }] } }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ QueryResponse: { Customer: [{ Id: "b" }, { Id: "a" }] } }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
