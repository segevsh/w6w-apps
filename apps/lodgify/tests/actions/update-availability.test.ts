import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import updateAvailability from "../../actions/update-availability.ts";

Deno.test("update-availability: POSTs the documented body to /v1/availability/{p}/{r}/set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await updateAvailability.execute({
    propertyId: 5,
    roomTypeId: 6,
    periodStart: "2026-07-01",
    periodEnd: "2026-07-05",
    available: 0,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/availability/5/6/set");
  assertEquals(JSON.parse(calls[0].body!), {
    period_start: "2026-07-01",
    period_end: "2026-07-05",
    available: 0,
  });
  assertEquals(out, { ok: true });
});
