import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/attendances-get.ts";

const sample = { id: 1, object: "attendance", status: "attended" };

Deno.test("attendances-get: reads /attendances/1 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 1 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/attendances/1");
  assertEquals(result.status, "attended");
});

Deno.test("attendances-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 1 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

Deno.test("attendances-get: declares the attendance status vocabulary", () => {
  const fields = action.output as Array<{ key: string; label: string }>;
  const status = fields.find((f) => f.key === "status")!.label;
  for (const value of ["not_registered", "registered", "attended", "no_show", "late_cancelled"]) {
    assertEquals(status.includes(value), true, `${value} missing from ${status}`);
  }
});
