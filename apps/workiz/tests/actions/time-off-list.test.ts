import { assertEquals } from "@std/assert";
import timeOffList from "../../actions/time-off-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-list: calls GET /TimeOff/get/ with the all flag", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ start: "2026-09-01", end: "2026-09-02", userName: "Sam" }],
  }]);
  const out = await timeOffList.execute({ all: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/TimeOff/get/");
  assertEquals(queryOf(calls[0].url), { all: "true" });
  assertEquals(out.items, [{ start: "2026-09-01", end: "2026-09-02", userName: "Sam" }]);
});

/** `false` is dropped, which is already Workiz's default for this flag. */
Deno.test("time-off-list: an unset all flag sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await timeOffList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("time-off-list: the all flag defaults to false, as the vendor declares", () => {
  assertEquals(timeOffList.params?.find((p) => p.key === "all")?.default, false);
});
