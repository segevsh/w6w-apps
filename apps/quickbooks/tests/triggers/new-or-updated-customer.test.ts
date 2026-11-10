import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-customer.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockQuickBooksCtx([{ body }]);

test("new-or-updated-customer: seeds, emits new rows, retries idempotently, and requests the literal feed", async () => {
  const seed = ctx({
    QueryResponse: { Customer: [{ Id: "1", MetaData: { LastUpdatedTime: "t1" } }] },
  });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/query?minorversion=75&query=SELECT+*+FROM+Customer+ORDERBY+MetaData.LastUpdatedTime+DESC+STARTPOSITION+1+MAXRESULTS+100",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({
      QueryResponse: {
        Customer: [{ Id: "2", MetaData: { LastUpdatedTime: "t3" } }, {
          Id: "1",
          MetaData: { LastUpdatedTime: "t1" },
        }],
      },
    }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({
      QueryResponse: {
        Customer: [{ Id: "2", MetaData: { LastUpdatedTime: "t3" } }, {
          Id: "1",
          MetaData: { LastUpdatedTime: "t1" },
        }],
      },
    }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ Id: "2", MetaData: { LastUpdatedTime: "t3" } }]);
  assertEquals(retry, first);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ QueryResponse: { Customer: [{ Id: "1", MetaData: { LastUpdatedTime: "t2" } }] } }).ctx,
  );
  assertEquals(edited.events.length, 1);
});
