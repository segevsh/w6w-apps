import { assertEquals, assertRejects } from "@std/assert";
import personTerminate from "../../actions/person-terminate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-terminate: POSTs /v1/employees/{id}/terminate with the date", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await personTerminate.execute(
    { employeeId: "5", terminationDate: "2026-12-31" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/employees/5/terminate");
  assertEquals(bodyOf(calls[0]), { terminationDate: "2026-12-31" });
  assertEquals(out, { status: 200 });
});

Deno.test("person-terminate: nests the notice period only with length and unit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }, { status: 200 }]);
  await personTerminate.execute({
    employeeId: "5",
    terminationDate: "2026-12-31",
    terminationReason: "Resigned",
    lastDayOfWork: "2026-12-30",
    noticePeriodLength: 2,
    noticePeriodUnit: "weeks",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    terminationDate: "2026-12-31",
    terminationReason: "Resigned",
    lastDayOfWork: "2026-12-30",
    noticePeriod: { unit: "weeks", length: 2 },
  });
  await personTerminate.execute(
    { employeeId: "5", terminationDate: "2026-12-31", noticePeriodLength: 2 },
    ctx,
  );
  assertEquals("noticePeriod" in (bodyOf(calls[1]) as object), false);
});

Deno.test("person-terminate: rejects a bad date", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() =>
    Promise.resolve(personTerminate.execute({ employeeId: "5", terminationDate: "tomorrow" }, ctx))
  );
});
