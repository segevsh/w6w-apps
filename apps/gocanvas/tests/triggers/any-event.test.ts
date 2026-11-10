import { describe, test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { errorsBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const sub = (params: Record<string, unknown>) => ({
  params,
  subscriptionId: "sub_1",
  callbackUrl: CALLBACK,
  hostUrl: "",
});
const refused = errorsBody("Dispatch is not enabled on this form");
const ok = (id: number) => ({ body: { id } });

const registered = (events: string[], formId: string | null = "346127") => ({
  formId,
  webhooks: events.map((eventType, i) => ({ eventType, id: String(10 + i) })),
});
const delivery = (
  body: unknown,
  state: unknown,
  query: Record<string, string> = {},
  method = "POST",
) => ({
  raw: { method, path: "/", query, headers: {} as Record<string, string>, body },
  params: {},
  state,
  subscriptionId: "sub_1",
});

describe("any-event trigger", () => {
  test("is declared as a webhook trigger with output, sample and an events param", () => {
    assert(app.triggers.some((t) => t.key === "any-event"));
    assertEquals(anyEvent.title, "Any Event");
    assert(anyEvent.output!.length > 0);
    assert(anyEvent.sample !== undefined);
    assertEquals(anyEvent.poll, undefined);
    assertEquals(typeof anyEvent.onSubscribe, "function");
    assertEquals(typeof anyEvent.onUnsubscribe, "function");
    const events = anyEvent.params!.find((p) => p.key === "events")!;
    assertEquals(events.type, "string");
    assert(!anyEvent.params!.some((p) => p.type === "secret"));
  });

  test("empty events registers all five; features the form lacks are skipped", async () => {
    const { ctx, calls } = mockCtx([
      ok(1),
      ok(2),
      { status: 422, body: refused },
      { status: 422, body: refused },
      { status: 422, body: refused },
    ]);
    const state = await anyEvent.onSubscribe!(sub({ formId: " 346127 " }), ctx);
    assertEquals(state, {
      formId: "346127",
      webhooks: [
        { eventType: "submission_create", id: "1" },
        { eventType: "submission_edit", id: "2" },
      ],
    });
    assertEquals(calls.map((c) => [c.method, new URL(c.url).pathname]), [
      ["POST", "/api/v3/forms/346127/webhooks"],
      ["POST", "/api/v3/forms/346127/webhooks"],
      ["POST", "/api/v3/forms/346127/webhooks"],
      ["POST", "/api/v3/forms/346127/webhooks"],
      ["POST", "/api/v3/forms/346127/webhooks"],
    ]);
    assertEquals(
      calls.map((c) => JSON.parse(c.body!)),
      [
        "submission_create",
        "submission_edit",
        "dispatch_create",
        "workflow_handoff_create",
        "submission_custom_status_change",
      ].map((event_type) => ({
        event_type,
        format: "json",
        push_url: `${CALLBACK}?event=${event_type}`,
        push_tag: "w6w",
      })),
    );
  });

  test("named events register only those, trimmed and de-duplicated; no form = company-wide", async () => {
    const { ctx, calls } = mockCtx([ok(7), ok(8)]);
    const state = await anyEvent.onSubscribe!(
      sub({ events: " submission_edit, dispatch_create ,submission_edit," }),
      ctx,
    );
    assertEquals(state, {
      formId: null,
      webhooks: [
        { eventType: "submission_edit", id: "7" },
        { eventType: "dispatch_create", id: "8" },
      ],
    });
    assertEquals(calls.length, 2);
    assertEquals(new URL(calls[0].url).pathname, "/api/v3/webhooks");
    assertEquals(JSON.parse(calls[1].body!), {
      event_type: "dispatch_create",
      format: "json",
      push_url: `${CALLBACK}?event=dispatch_create`,
      push_tag: "w6w",
    });
  });

  test("an unknown event name is refused before any request", async () => {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(
      () => anyEvent.onSubscribe!(sub({ events: "submission_create, form_delete" }), ctx),
      Error,
      'Unknown GoCanvas event "form_delete"',
    );
    assertEquals(calls.length, 0);
  });

  test("a NAMED event GoCanvas refuses fails the subscription and removes the ones made", async () => {
    const { ctx, calls } = mockCtx([ok(7), { status: 422, body: refused }, { body: {} }]);
    await assertRejects(
      () =>
        anyEvent.onSubscribe!(sub({ formId: "9", events: "submission_edit,dispatch_create" }), ctx),
      Error,
      "GoCanvas 422",
    );
    assertEquals(calls.length, 3);
    assertEquals(calls[2].method, "DELETE");
    assertEquals(new URL(calls[2].url).pathname, "/api/v3/forms/9/webhooks/7");
  });

  test("with empty events a refused submission_edit (not feature-gated) still fails and rolls back", async () => {
    const { ctx, calls } = mockCtx([ok(1), { status: 422, body: errorsBody("exists") }, {
      body: {},
    }]);
    await assertRejects(
      () => anyEvent.onSubscribe!(sub({ formId: "9" }), ctx),
      Error,
      "GoCanvas 422",
    );
    assertEquals(calls[2].method, "DELETE");
    assertEquals(new URL(calls[2].url).pathname, "/api/v3/forms/9/webhooks/1");
  });

  test("a server error on a feature-gated event is not swallowed", async () => {
    const { ctx } = mockCtx([
      ok(1),
      ok(2),
      { status: 500, body: errorsBody("boom") },
      { body: {} },
      {
        body: {},
      },
    ]);
    await assertRejects(
      () => anyEvent.onSubscribe!(sub({ formId: "9" }), ctx),
      Error,
      "GoCanvas 500",
    );
  });

  test("a response without a webhook id fails and removes the ones made", async () => {
    const { ctx, calls } = mockCtx([ok(1), { body: {} }, { body: {} }]);
    await assertRejects(
      () =>
        anyEvent.onSubscribe!(
          sub({ formId: "9", events: "submission_create,submission_edit" }),
          ctx,
        ),
      Error,
      "webhook id",
    );
    assertEquals(calls[2].method, "DELETE");
  });

  test("onUnsubscribe deletes every webhook; 404 counts as gone; other failures surface after the rest", async () => {
    const state = registered(["submission_create", "submission_edit", "dispatch_create"]);
    const all = mockCtx([{ body: { message: "deleted" } }, {
      status: 404,
      body: errorsBody("Webhook not found"),
    }, { body: { message: "deleted" } }]);
    await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, all.ctx);
    assertEquals(all.calls.map((c) => [c.method, new URL(c.url).pathname]), [
      ["DELETE", "/api/v3/forms/346127/webhooks/10"],
      ["DELETE", "/api/v3/forms/346127/webhooks/11"],
      ["DELETE", "/api/v3/forms/346127/webhooks/12"],
    ]);

    const boom = mockCtx([{ status: 500, body: errorsBody("boom") }, {
      body: { message: "deleted" },
    }]);
    await assertRejects(
      () =>
        anyEvent.onUnsubscribe!(
          {
            params: {},
            state: registered(["submission_create", "submission_edit"], null),
            subscriptionId: "s",
          },
          boom.ctx,
        ),
      Error,
      "GoCanvas 500",
    );
    assertEquals(boom.calls.length, 2);
    assertEquals(new URL(boom.calls[1].url).pathname, "/api/v3/webhooks/11");

    const none = mockCtx([]);
    await anyEvent.onUnsubscribe!({ params: {}, state: undefined, subscriptionId: "s" }, none.ctx);
    assertEquals(none.calls.length, 0);
  });
});

describe("any-event ingest filter", () => {
  const state = registered(["submission_create", "dispatch_create"]);
  const payload = { type: "dispatch_create", dispatch_item: { id: 1 } };

  test("a delivery of a registered event is emitted with its event type (named by the push_url query)", async () => {
    const out = evs(
      await anyEvent.handleIngest!(
        delivery(payload, state, { event: "submission_create" }),
        mockCtx().ctx,
      ),
    );
    assertEquals(out, [{ eventType: "submission_create", formId: "346127", payload }]);
  });

  test("without the query the payload's own type names the event; JSON text bodies parse", async () => {
    const out = evs(
      await anyEvent.handleIngest!(delivery(JSON.stringify(payload), state), mockCtx().ctx),
    );
    assertEquals(out, [{ eventType: "dispatch_create", formId: "346127", payload }]);
  });

  test("an event the subscription did not ask for is filtered out", async () => {
    const ctx = mockCtx().ctx;
    assertEquals(
      evs(
        await anyEvent.handleIngest!(delivery(payload, state, { event: "submission_edit" }), ctx),
      ),
      [],
    );
    assertEquals(
      evs(await anyEvent.handleIngest!(delivery({ type: "submission_edit" }, state), ctx)),
      [],
    );
  });

  test("one registered event names an untyped delivery; several make it ambiguous", async () => {
    const ctx = mockCtx().ctx;
    const one = registered(["submission_edit"], null);
    assertEquals(evs(await anyEvent.handleIngest!(delivery({ a: 1 }, one), ctx)), [{
      eventType: "submission_edit",
      formId: null,
      payload: { a: 1 },
    }]);
    await assertRejects(
      async () => await anyEvent.handleIngest!(delivery({ a: 1 }, state), ctx),
      Error,
      "which GoCanvas event",
    );
  });

  test("a GET, an array body or non-JSON text is refused", async () => {
    const ctx = mockCtx().ctx;
    await assertRejects(
      async () => await anyEvent.handleIngest!(delivery({ a: 1 }, state, {}, "GET"), ctx),
      Error,
      "POST",
    );
    await assertRejects(
      async () => await anyEvent.handleIngest!(delivery([1], state), ctx),
      Error,
      "JSON object",
    );
    await assertRejects(
      async () => await anyEvent.handleIngest!(delivery("not json", state), ctx),
      Error,
      "not JSON",
    );
  });
});
