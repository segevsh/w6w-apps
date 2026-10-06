import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-entry.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("create-entry: POSTs a time-span entry with only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { entry: { id: 5 } } }]);
  const out = await exec(action, {
    customersId: 3,
    servicesId: "4",
    timeSince: "2026-10-06T08:00:00Z",
    timeUntil: "2026-10-06T09:00:00Z",
    billable: "1",
    text: "Standup",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/entries`);
  assertEquals(bodyOf(calls[0]), {
    customers_id: 3,
    time_since: "2026-10-06T08:00:00Z",
    time_until: "2026-10-06T09:00:00Z",
    services_id: 4,
    billable: 1,
    text: "Standup",
  });
  assertEquals(out, { entry: { id: 5 }, stopped: null });
});

Deno.test("create-entry: lump sum and lump-sum service forms map their own fields", async () => {
  const a = mockCtx([{ body: { entry: { id: 6 } } }]);
  await exec(action, { customersId: 3, servicesId: 4, timeSince: "t", lumpsum: 12.5 }, a.ctx);
  assertEquals(bodyOf(a.calls[0]), {
    customers_id: 3,
    time_since: "t",
    services_id: 4,
    lumpsum: 12.5,
  });
  const b = mockCtx([{ body: { entry: { id: 7 } } }]);
  await exec(action, {
    customersId: 3,
    timeSince: "t",
    lumpsumServicesId: 2,
    lumpsumServicesAmount: 3,
  }, b.ctx);
  assertEquals(bodyOf(b.calls[0]), {
    customers_id: 3,
    time_since: "t",
    lumpsum_services_id: 2,
    lumpsum_services_amount: 3,
  });
});

Deno.test("create-entry: incomplete forms are refused before any request", async () => {
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { customersId: 3, timeSince: "t", servicesId: 1 }, none.ctx),
    Error,
    "timeUntil",
  );
  await assertRejects(
    () => exec(action, { customersId: 3, timeSince: "t", timeUntil: "u" }, none.ctx),
    Error,
    "servicesId",
  );
  await assertRejects(
    () => exec(action, { customersId: 3, timeSince: "t", lumpsumServicesId: 2 }, none.ctx),
    Error,
    "lumpsumServicesAmount",
  );
  await assertRejects(
    () => exec(action, { timeSince: "t", timeUntil: "u", servicesId: 1 }, none.ctx),
    Error,
    "customersId",
  );
  assertEquals(none.calls.length, 0);
});
