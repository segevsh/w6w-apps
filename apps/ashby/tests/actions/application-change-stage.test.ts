import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-change-stage.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("application-change-stage: advances an application", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1", status: "Active" })]);
  await action.execute!({ applicationId: "a1", interviewStageId: "stage_2" }, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/application.changeStage");
  assertEquals(JSON.parse(calls[0].body!), {
    applicationId: "a1",
    interviewStageId: "stage_2",
  });
});

Deno.test("application-change-stage: an archive reason reaches the wire", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1", status: "Archived" })]);
  await action.execute!({
    applicationId: "a1",
    interviewStageId: "stage_archived",
    archiveReasonId: "reason_1",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).archiveReasonId, "reason_1");
});

/**
 * Ashby's refusal is opaque; the cause is almost always the missing reason, so
 * the error says where to get one.
 */
Deno.test("application-change-stage: an archive refusal is explained", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      success: false,
      errorInfo: { code: "archive_reason_required", message: "Archive reason required" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ applicationId: "a1", interviewStageId: "s1" }, ctx),
    Error,
    "archive-reason-list",
  );
});

/** A bulk rejection that accidentally emails everybody is not recoverable. */
Deno.test("application-change-stage: a rejection email is warned about", async () => {
  const { ctx, logs } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({
    applicationId: "a1",
    interviewStageId: "s1",
    archiveEmail: { subject: "Thanks" },
  }, ctx);
  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning for an attached rejection email");
  assert(/rejection email/.test(warning!.message), warning!.message);
});

Deno.test("application-change-stage: no email is attached unless asked for", async () => {
  const { ctx, calls, logs } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({ applicationId: "a1", interviewStageId: "s1", archiveEmail: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).archiveEmail, undefined);
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("application-change-stage: both ids are required", async () => {
  const noApp = mockCtx();
  await assertRejects(
    async () => await action.execute!({ interviewStageId: "s1" }, noApp.ctx),
    Error,
    "applicationId",
  );
  const noStage = mockCtx();
  await assertRejects(
    async () => await action.execute!({ applicationId: "a1" }, noStage.ctx),
    Error,
    "interviewStageId",
  );
});

Deno.test("application-change-stage: says that archiving is a rejection", () => {
  assert(/IS a rejection/.test(action.description!), action.description);
});
