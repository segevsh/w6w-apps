import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-get.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("application-get: fetches by application id", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1", status: "Active" })]);
  const result = await action.execute!({ applicationId: "a1" }, ctx) as { status: string };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/application.info");
  assertEquals(JSON.parse(calls[0].body!), { applicationId: "a1" });
  assertEquals(result.status, "Active");
});

/** The id a custom careers page gets back, so no mapping step is needed. */
Deno.test("application-get: fetches by a submitted form instance id", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({ submittedFormInstanceId: "form_1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { submittedFormInstanceId: "form_1" });
});

/** Ashby uses the application id if both are given; sending both is misleading. */
Deno.test("application-get: the application id wins, and the form id is dropped", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({ applicationId: "a1", submittedFormInstanceId: "form_stale" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { applicationId: "a1" });
});

Deno.test("application-get: needs one of the two ids", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "applicationId");
  assertEquals(calls.length, 0);
});

Deno.test("application-get: says which id wins when both are given", () => {
  assert(/uses the application id/.test(action.description!), action.description);
});
