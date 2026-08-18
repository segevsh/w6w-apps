import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/geolocate.ts";

const located = rpc({ location: { lat: 51.5074, lng: -0.1278 }, accuracy: 120 });
const wifi = '[{"macAddress":"00:25:9c:cf:1c:ac","signalStrength":-43},' +
  '{"macAddress":"00:25:9c:cf:1c:ad","signalStrength":-55}]';

Deno.test("geolocate: posts the signals and returns the point with its accuracy", async () => {
  const { ctx, calls } = mockCtx([located]);
  const result = await action.execute!({ wifiAccessPoints: wifi }, ctx) as {
    located: boolean;
    accuracy: number;
  };
  assertEquals(new URL(calls[0].url).pathname, "/geolocation/v1/geolocate");
  assertEquals(JSON.parse(calls[0].body!).wifiAccessPoints.length, 2);
  assertEquals(result.located, true);
  assertEquals(result.accuracy, 120);
});

/**
 * The documented surprise: Google answers 404 when it cannot geolocate. That
 * is an answer, not a broken URL.
 */
Deno.test("geolocate: a 404 is 'not enough signal', not a failure", async () => {
  const { ctx } = mockCtx([rpc({ error: { code: 404, message: "Not found" } }, 404)]);
  const result = await action.execute!({ wifiAccessPoints: wifi }, ctx) as {
    located: boolean;
    reason: string;
  };
  assertEquals(result.located, false);
  assert(/fewer than two usable wifi/.test(result.reason), result.reason);
  assert(/an answer, not a failure/.test(result.reason), result.reason);
});

/** Every other error is still an error. */
Deno.test("geolocate: a rejected key still throws", async () => {
  const { ctx } = mockCtx([
    rpc({
      error: {
        code: 400,
        message: "API key not valid. Please pass a valid API key.",
        details: [{ reason: "API_KEY_INVALID" }],
      },
    }, 400),
  ]);
  await assertRejects(
    async () => await action.execute!({ wifiAccessPoints: wifi }, ctx),
    Error,
    "CREDENTIAL failure",
  );
});

/**
 * Google's default is IP fallback ON, which from a workflow runner geolocates a
 * datacentre — a confident answer to a question nobody asked.
 */
Deno.test("geolocate: IP fallback is off by default and refuses an empty request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "machine running this workflow",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.params!.find((p) => p.key === "considerIp")!.default, false);
});

Deno.test("geolocate: turning IP fallback on is allowed, and flagged in the result", async () => {
  const { ctx, calls } = mockCtx([located]);
  const result = await action.execute!({ considerIp: true }, ctx) as { usedIpFallback: boolean };
  assertEquals(JSON.parse(calls[0].body!).considerIp, true);
  assertEquals(result.usedIpFallback, true);
});

Deno.test("geolocate: with real signals, the IP flag stays false even when fallback is on", async () => {
  const { ctx } = mockCtx([located]);
  const result = await action.execute!({ considerIp: true, wifiAccessPoints: wifi }, ctx) as {
    usedIpFallback: boolean;
  };
  assertEquals(result.usedIpFallback, false);
});

Deno.test("geolocate: cell towers are an alternative to wifi", async () => {
  const { ctx, calls } = mockCtx([located]);
  await action.execute!({
    cellTowers: '[{"cellId":42,"locationAreaCode":415,"mobileCountryCode":310,' +
      '"mobileNetworkCode":410}]',
    radioType: "lte",
    carrier: "Vodafone",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cellTowers.length, 1);
  assertEquals(body.radioType, "lte");
  assertEquals(body.carrier, "Vodafone");
});

Deno.test("geolocate: malformed signal JSON names the field", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ wifiAccessPoints: "{oops" }, ctx),
    Error,
    "`wifiAccessPoints` is not valid JSON",
  );
});

/** MAC addresses identify devices. */
Deno.test("geolocate: logs accuracy, never the signals", async () => {
  const { ctx, logs } = mockCtx([located]);
  await action.execute!({ wifiAccessPoints: wifi }, ctx);
  assert(!JSON.stringify(logs).includes("00:25:9c"), JSON.stringify(logs));
  assertEquals(logs[0].data, { accuracy: 120, usedIpFallback: false });
});
