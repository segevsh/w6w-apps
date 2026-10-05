import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-request.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };
const W = "a3f1c2d4e5b6478990a1b2c3d4e5f607";
const days = [{ date: "2026-11-02", dailyQuantity: 1, timeOffType: "t1", comment: "trip" }];

Deno.test("time-off-request: POSTs days plus the Submitted action", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "evt1", overallStatus: "Submitted" },
  }], D);
  const result = await action.execute({ workerId: W, days }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    `https://wd2-impl-services1.workday.com/ccx/api/absenceManagement/v5/acme_impl1/workers/${W}/requestTimeOff`,
  );
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["wd-warning-action"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    days: [{ date: "2026-11-02", dailyQuantity: 1, timeOffType: { id: "t1" }, comment: "trip" }],
    businessProcessParameters: { action: { id: "d9e4223e446c11de98360015c5e6daf6" } },
  });
  assertEquals(result.record, { id: "evt1", overallStatus: "Submitted" });
});

Deno.test("time-off-request: submit off omits the business process action; warnings header is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], D);
  await action.execute({
    workerId: W,
    days: JSON.stringify(days),
    submit: false,
    acceptWarnings: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).businessProcessParameters, undefined);
  assertEquals(calls[0].headers["wd-warning-action"], "updateonwarning");
});

Deno.test("time-off-request: is declared non-idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("time-off-request: refuses bad days without calling Workday", async () => {
  for (
    const bad of [
      [],
      "not json",
      [{ date: "2026-11-02", timeOffType: "t1" }],
      [{ date: "2026-11-02", dailyQuantity: 0, timeOffType: "t1" }],
      [{ date: "02/11/2026", dailyQuantity: 1, timeOffType: "t1" }],
      [{ date: "2026-11-02", dailyQuantity: 1 }],
    ]
  ) {
    const { ctx, calls } = mockCtx([], D);
    await assertRejects(async () => await action.execute({ workerId: W, days: bad }, ctx));
    assertEquals(calls.length, 0);
  }
});

Deno.test("time-off-request: a 400 carries the field errors", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "Validation error", errors: [{ error: "Date is not valid", field: "date" }] },
  }], D);
  const err = await assertRejects(async () => await action.execute({ workerId: W, days }, ctx));
  assert(/date: Date is not valid/.test((err as Error).message));
});
