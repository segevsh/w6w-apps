import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

/** Unfiltered counts every rejection since the role opened. */
Deno.test("application-list: defaults to Active rather than everything", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "a1" }])]);
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, "Active");
});

Deno.test("application-list: several statuses are sent as an array", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ status: "Active, Hired" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, ["Active", "Hired"]);
});

Deno.test("application-list: a blank status sends no filter", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ status: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, undefined);
});

Deno.test("application-list: the job filter and date filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ jobId: "j1", createdAfter: "2026-08-18T12:00:00Z" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.jobId, "j1");
  assertEquals(body.createdAfter, 1787054400000);
});

Deno.test("application-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "a1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as { syncToken: string };
  assertEquals(result.syncToken, "Rld2D");
});

/** `Lead` is a sourced person who never applied, and is usually miscounted. */
Deno.test("application-list: the status param explains what Lead means", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "status"
  )!;
  assert(/has not applied/.test(p.hint!), p.hint);
});
