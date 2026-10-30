import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/retention-query.ts";

const conn = { display: { projectId: "123", region: "us" } };

test("retention-query: sends both events and the retention type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await action.execute!({
    fromDate: "2026-07-01",
    toDate: "2026-08-01",
    bornEvent: "Signed Up",
    event: "Opened App",
    retentionType: "compounded",
    unit: "week",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("born_event"), "Signed Up");
  assertEquals(q.get("event"), "Opened App");
  assertEquals(q.get("retention_type"), "compounded");
  assertEquals(q.get("unit"), "week");
});

/** Birth-type retention has no cohort without a born event. */
test("retention-query: birth retention without a cohort event is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ fromDate: "2026-07-01", toDate: "2026-08-01" }, ctx),
    Error,
    "bornEvent",
  );
  assertEquals(calls.length, 0);
});

test("retention-query: the two retention types are described as incomparable", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "retentionType")!;
  assert(/not comparable/.test(p.hint!), p.hint);
});
