import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { HTTPS_URL_PATTERN } from "../../lib/params.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

/**
 * `events` is an array of OBJECTS in the vendor's schema
 * (`[{"eventType": "feature.updated"}]`), not of strings. A bare string array
 * is rejected, so this action does the wrapping.
 */
Deno.test("webhook-create: events are wrapped into {eventType} objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "w-1" }) }]);
  const out = await action.execute({
    name: "Feature changes webhook",
    events: ["feature.created", "feature.updated"],
    url: "https://example.com/hook",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  assertEquals(bodyOf(calls[0]), {
    data: {
      fields: {
        name: "Feature changes webhook",
        events: [{ eventType: "feature.created" }, { eventType: "feature.updated" }],
        notification: { url: "https://example.com/hook", version: 1 },
      },
    },
  });
  assertEquals(out.data, { id: "w-1" });
});

/** The payload-version enum has exactly one member, so it is pinned, not exposed. */
Deno.test("webhook-create: the payload version is always 1 and is not a param", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ name: "n", events: "note.created", url: "https://e.com/h" }, ctx);
  const body = bodyOf(calls[0]) as {
    data: { fields: { notification: { version: number } } };
  };
  assertEquals(body.data.fields.notification.version, 1);
  assertEquals(action.params?.some((p) => p.key === "version"), false);
});

Deno.test("webhook-create: notification headers are forwarded when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({
    name: "n",
    events: "note.created",
    url: "https://e.com/h",
    notificationHeaders: { authorization: "Bearer shhh" },
  }, ctx);
  const body = bodyOf(calls[0]) as {
    data: { fields: { notification: { headers?: Record<string, string> } } };
  };
  assertEquals(body.data.fields.notification.headers, { authorization: "Bearer shhh" });
});

Deno.test("webhook-create: the headers param is masked and encrypted by the host", () => {
  const p = action.params?.find((p) => p.key === "notificationHeaders");
  assertEquals(p?.type, "json");
  assertEquals(p?.secret, true);
});

Deno.test("webhook-create: no headers key is sent when none is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ name: "n", events: "note.created", url: "https://e.com/h" }, ctx);
  const body = bodyOf(calls[0]) as {
    data: { fields: { notification: Record<string, unknown> } };
  };
  assertEquals(Object.keys(body.data.fields.notification).sort(), ["url", "version"]);
});

Deno.test("webhook-create: an empty event list is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ name: "n", events: "", url: "https://e.com/h" }, ctx)),
    Error,
    "at least one event",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: the https-only URL rule is declared on the param", () => {
  const p = action.params?.find((p) => p.key === "url");
  assertEquals(p?.required, true);
  assertEquals(p?.validation?.pattern, HTTPS_URL_PATTERN);
  assertEquals(HTTPS_URL_PATTERN, "^https://.+");
  assertEquals(p?.validation?.maxLength, 1024);
});

Deno.test("webhook-create: warns that a retry would double every event", () => {
  assertEquals(action.idempotent, false);
  assert(action.description!.toLowerCase().includes("twice"), action.description!);
});
