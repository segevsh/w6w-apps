import { assertEquals } from "@std/assert";
import leadList from "../../actions/lead-list.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("lead-list: calls GET /lead/all/ with the full filter set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ UUID: "l1" }] }]);
  const out = await leadList.execute(
    { start_date: "2026-09-01", offset: 0, records: 100, only_open: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/lead/all/");
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-09-01",
    offset: "0",
    records: "100",
    only_open: "true",
  });
  assertEquals(out.items, [{ UUID: "l1" }]);
});

/** Workiz's `status` is an OpenAPI array; the app sends it as repeated params. */
Deno.test("lead-list: status is sent as a repeated query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await leadList.execute({ status: ["Submited", "In progress"] }, ctx);
  assertEquals(queryAll(calls[0].url), { status: ["Submited", "In progress"] });
});

Deno.test("lead-list: only_open=false is sent, not dropped — it is a real filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await leadList.execute({ only_open: false }, ctx);
  assertEquals(queryOf(calls[0].url), { only_open: "false" });
});

Deno.test("lead-list: no filters means no query, and the vendor's 14-day default applies", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await leadList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  const records = leadList.params?.find((p) => p.key === "records");
  assertEquals(records?.default, 100);
  assertEquals(leadList.params?.find((p) => p.key === "only_open")?.default, true);
});
