import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/instructors-get.ts";

const sample = { id: 4, object: "instructor", name: "Ada", staff: 11 };

Deno.test("instructors-get: reads /instructors/4 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 4 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/instructors/4");
  assertEquals(result.staff, 11);
});

Deno.test("instructors-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 4 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

/** The link from a teaching profile to the account that can log in. */
Deno.test("instructors-get: declares the `staff` id a workflow joins on", () => {
  const fields = action.output as Array<{ key: string; type: string }>;
  assertEquals(fields.find((f) => f.key === "staff")!.type, "number");
});
