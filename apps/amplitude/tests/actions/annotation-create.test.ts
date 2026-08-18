import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/annotation-create.ts";

const created = ok({ annotation: { id: 7, date: "2026-08-18", label: "Release 1.4.2" } });

Deno.test("annotation-create: posts the date and label", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({ date: "2026-08-18", label: "Release 1.4.2" }, ctx) as {
    id: number;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/2/annotations");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("date"), "2026-08-18");
  assertEquals(url.searchParams.get("label"), "Release 1.4.2");
  assertEquals(result.id, 7);
});

/**
 * This endpoint wants dashes; the query endpoints want YYYYMMDD without them.
 * Getting it wrong is easy and the error should say which is which.
 */
Deno.test("annotation-create: a YYYYMMDD date is refused, naming the inconsistency", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ date: "20260818", label: "x" }, ctx),
    Error,
  );
  assert(/must be YYYY-MM-DD/.test(error.message), error.message);
  assert(/query endpoints want YYYYMMDD/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("annotation-create: a chart id scopes it to one chart", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ date: "2026-08-18", label: "x", chartId: "abc" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("app_id"), "abc");
});

Deno.test("annotation-create: needs a date and a label", async () => {
  const noDate = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ label: "x" }, noDate.ctx),
    Error,
    "`date` is required",
  );
  const noLabel = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ date: "2026-08-18" }, noLabel.ctx),
    Error,
    "`label` is required",
  );
});

Deno.test("annotation-create: logs the date only", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({ date: "2026-08-18", label: "Release 1.4.2" }, ctx);
  assertEquals(logs[0].data, { date: "2026-08-18" });
});

/** Posting twice leaves two permanent lines on every chart. */
Deno.test("annotation-create: is non-idempotent and warns about retries", () => {
  assertEquals(action.idempotent, false);
  assert(/NO uniqueness/.test(action.description!), action.description);
});
