import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/service-call.ts";

const changed = ok([{ entity_id: "light.kitchen", state: "on" }]);

Deno.test("service-call: posts to the domain and service path", async () => {
  const { ctx, calls } = mockCtx([changed], { display });
  const result = await action.execute!({
    domain: "light",
    service: "turn_on",
    entityId: "light.kitchen",
    data: '{"brightness_pct": 60}',
  }, ctx) as { changedCount: number };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/services/light/turn_on");
  assertEquals(JSON.parse(calls[0].body!), {
    brightness_pct: 60,
    entity_id: ["light.kitchen"],
  });
  assertEquals(result.changedCount, 1);
});

/**
 * A 200 with nothing changed is normal — the light was already on, or the
 * device is offline, or the service is asynchronous.
 */
Deno.test("service-call: no changed states is a success, and the count says so", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({ domain: "light", service: "turn_on" }, ctx) as {
    changedCount: number;
  };
  assertEquals(result.changedCount, 0);
});

/** A dotted service is the shape people naturally write. */
Deno.test("service-call: a service given as `domain.service` is refused with the split", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ domain: "light", service: "light.turn_on" }, ctx),
    Error,
  );
  assert(/give `domain` as "light" and `service` as "turn_on"/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("service-call: several targets are sent as a list", async () => {
  const { ctx, calls } = mockCtx([changed], { display });
  await action.execute!({
    domain: "homeassistant",
    service: "turn_off",
    entityId: "light.kitchen, light.hall",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).entity_id, ["light.kitchen", "light.hall"]);
});

Deno.test("service-call: a service with no target sends no entity_id at all", async () => {
  const { ctx, calls } = mockCtx([changed], { display });
  await action.execute!({
    domain: "notify",
    service: "persistent_notification",
    data: '{"message": "hello"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { message: "hello" });
});

/** Services that return data require the flag; ordinary ones reject it. */
Deno.test("service-call: return_response is opt-in and unwraps the response", async () => {
  const off = mockCtx([changed], { display });
  await action.execute!({ domain: "light", service: "turn_on" }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("return_response"), false);

  const on = mockCtx([
    ok({ changed_states: [], service_response: { forecast: [{ temperature: 21 }] } }),
  ], { display });
  const result = await action.execute!({
    domain: "weather",
    service: "get_forecasts",
    returnResponse: true,
  }, on.ctx) as { response: { forecast: unknown[] }; changedCount: number };
  assertEquals(new URL(on.calls[0].url).searchParams.get("return_response"), "true");
  assertEquals(result.response.forecast.length, 1);
  assertEquals(result.changedCount, 0);
});

Deno.test("service-call: a friendly name in the target is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!(
        { domain: "light", service: "turn_on", entityId: "Kitchen Light" },
        ctx,
      ),
    Error,
    "friendly name",
  );
});

Deno.test("service-call: needs a domain and a service", async () => {
  const noDomain = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ service: "turn_on" }, noDomain.ctx),
    Error,
    "`domain` is required",
  );
  const noService = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ domain: "light" }, noService.ctx),
    Error,
    "`service` is required",
  );
});

Deno.test("service-call: logs the call shape, never the data", async () => {
  const { ctx, logs } = mockCtx([changed], { display });
  await action.execute!({
    domain: "notify",
    service: "mobile_app",
    data: '{"message":"something private"}',
  }, ctx);
  assert(!JSON.stringify(logs).includes("private"), JSON.stringify(logs));
  assertEquals(logs[0].data, {
    domain: "notify",
    service: "mobile_app",
    targets: 0,
    changedCount: 1,
  });
});

Deno.test("service-call: says a 200 is not confirmation", () => {
  assert(/is not confirmation/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
