import { assertEquals } from "@std/assert";
import action from "../../actions/update-domain-settings.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-domain-settings: PUTs only the fields set, keeping explicit false", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "d1" } } }]);
  await exec(action, { domainId: "d1", sendPaused: false, trackOpens: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/domains/d1/settings");
  assertEquals(bodyOf(calls[0]), { send_paused: false, track_opens: true });
});

Deno.test("update-domain-settings: maps every setting to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await exec(action, {
    domainId: "d1",
    sendPaused: true,
    trackClicks: true,
    trackOpens: true,
    trackUnsubscribe: true,
    trackContent: true,
    customTrackingEnabled: true,
    customTrackingSubdomain: "email",
    precedenceBulk: true,
    ignoreDuplicatedRecipients: true,
  }, ctx);
  assertEquals(Object.keys(bodyOf(calls[0])).sort(), [
    "custom_tracking_enabled",
    "custom_tracking_subdomain",
    "ignore_duplicated_recipients",
    "precedence_bulk",
    "send_paused",
    "track_clicks",
    "track_content",
    "track_opens",
    "track_unsubscribe",
  ]);
});

Deno.test("update-domain-settings: is idempotent", () => assertEquals(action.idempotent, true));
