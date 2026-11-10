import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { errorsBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import submissionCreated from "../../triggers/submission-created.ts";
import submissionEdited from "../../triggers/submission-edited.ts";
import dispatchCreated from "../../triggers/dispatch-created.ts";
import workflowHandoffCreated from "../../triggers/workflow-handoff-created.ts";
import submissionStatusChanged from "../../triggers/submission-status-changed.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const cases = [
  { t: submissionCreated, key: "submission-created", type: "submission_create" },
  { t: submissionEdited, key: "submission-edited", type: "submission_edit" },
  { t: dispatchCreated, key: "dispatch-created", type: "dispatch_create" },
  { t: workflowHandoffCreated, key: "workflow-handoff-created", type: "workflow_handoff_create" },
  {
    t: submissionStatusChanged,
    key: "submission-status-changed",
    type: "submission_custom_status_change",
  },
];

const call = (body: unknown, method = "POST", formId: string | null = "346127") => ({
  raw: { method, path: "/", query: {}, headers: {} as Record<string, string>, body },
  params: {},
  state: { formId, webhookId: "9" },
  subscriptionId: "sub_1",
});

test("app declares exactly these 17 trigger keys, in this order, none twice", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "submission-created",
    "submission-edited",
    "dispatch-created",
    "workflow-handoff-created",
    "submission-status-changed",
    "any-event",
    "new-form",
    "new-user",
    "new-customer",
    "new-site",
    "new-project",
    "new-group",
    "new-department",
    "new-department-user",
    "new-form-assigned-user",
    "new-submission",
    "new-dispatch",
  ]);
});

test("app declares the five named webhook triggers (first in the list) with output and sample, no poll", () => {
  assertEquals(app.triggers.slice(0, cases.length).map((t) => t.key), cases.map((c) => c.key));
  for (const { t } of cases) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assert(!(t.params ?? []).some((p) => p.type === "secret"));
  }
});

for (const { t, type } of cases) {
  test(`${type}: onSubscribe POSTs the documented body to the form's webhooks, keeps the id`, async () => {
    const { ctx, calls } = mockCtx([{ body: { id: 17, event_type: type, source: "form" } }]);
    const state = await t.onSubscribe!(
      {
        params: { formId: " 346127 " },
        subscriptionId: "sub_1",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      ctx,
    );
    assertEquals(state, { formId: "346127", webhookId: "17" });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "POST");
    assertEquals(new URL(calls[0].url).pathname, "/api/v3/forms/346127/webhooks");
    assertEquals(JSON.parse(calls[0].body!), {
      event_type: type,
      format: "json",
      push_url: CALLBACK,
      push_tag: "w6w",
    });
  });

  test(`${type}: no form → the company-wide /webhooks path`, async () => {
    const { ctx, calls } = mockCtx([{ body: { id: 6, source: "company" } }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { formId: null, webhookId: "6" });
    assertEquals(new URL(calls[0].url).pathname, "/api/v3/webhooks");
  });

  test(`${type}: a delivery is passed through whole beside the event type and form`, async () => {
    const payload = { id: 5, anything: ["GoCanvas", "documents only metadata"] };
    const out = evs(await t.handleIngest!(call(payload), mockCtx().ctx));
    assertEquals(out, [{ eventType: type, formId: "346127", payload }]);
  });
}

test("a company-wide subscription's events carry formId null; JSON text bodies parse", async () => {
  const out = evs(
    await submissionCreated.handleIngest!(
      call('{ "form" : { "id" : 1 } }', "POST", null),
      mockCtx().ctx,
    ),
  );
  assertEquals(out, [{
    eventType: "submission_create",
    formId: null,
    payload: { form: { id: 1 } },
  }]);
});

test("onSubscribe surfaces GoCanvas's refusal (one webhook per event per form)", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorsBody("Webhook for this event type already exists"),
  }]);
  await assertRejects(
    () =>
      submissionCreated.onSubscribe!(
        { params: { formId: "1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "GoCanvas 422",
  );
});

test("onSubscribe fails when GoCanvas returns no webhook id", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(
    () =>
      submissionCreated.onSubscribe!(
        { params: { formId: "1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "webhook id",
  );
});

test("onUnsubscribe DELETEs the form webhook or the company webhook; 404 is gone", async () => {
  const form = mockCtx([{ body: { message: "deleted" } }]);
  await submissionCreated.onUnsubscribe!(
    { params: {}, state: { formId: "346127", webhookId: "17" }, subscriptionId: "s" },
    form.ctx,
  );
  assertEquals(form.calls[0].method, "DELETE");
  assertEquals(new URL(form.calls[0].url).pathname, "/api/v3/forms/346127/webhooks/17");

  const company = mockCtx([{ body: { message: "deleted" } }]);
  await submissionCreated.onUnsubscribe!(
    { params: {}, state: { formId: null, webhookId: "6" }, subscriptionId: "s" },
    company.ctx,
  );
  assertEquals(new URL(company.calls[0].url).pathname, "/api/v3/webhooks/6");

  const gone = mockCtx([{ status: 404, body: errorsBody("Webhook not found") }]);
  await submissionCreated.onUnsubscribe!(
    { params: {}, state: { formId: "1", webhookId: "2" }, subscriptionId: "s" },
    gone.ctx,
  );

  const boom = mockCtx([{ status: 500, body: errorsBody("boom") }]);
  await assertRejects(
    () =>
      submissionCreated.onUnsubscribe!(
        { params: {}, state: { formId: "1", webhookId: "2" }, subscriptionId: "s" },
        boom.ctx,
      ),
    Error,
    "GoCanvas 500",
  );

  const none = mockCtx([]);
  await submissionCreated.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});

test("a GET, an array body or non-JSON text is refused", async () => {
  const ctx = mockCtx().ctx;
  await assertRejects(
    async () => await submissionCreated.handleIngest!(call({ a: 1 }, "GET"), ctx),
    Error,
    "POST",
  );
  await assertRejects(
    async () => await submissionCreated.handleIngest!(call([1]), ctx),
    Error,
    "JSON object",
  );
  await assertRejects(
    async () => await submissionCreated.handleIngest!(call("not json"), ctx),
    Error,
    "not JSON",
  );
});

test("README states the unsigned, URL-is-the-secret trust model", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(readme.includes("GoCanvas does not sign its webhooks"));
  assert(readme.includes("callback URL is the secret"));
});
