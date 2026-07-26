import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-location.ts";

Deno.test("message-send-location: POSTs sendLocation with the coordinates", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: { message_id: 1 } } }]);
  await action.execute({ chatId: "1", latitude: 51.5, longitude: -0.12 }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendLocation");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", latitude: 51.5, longitude: -0.12 });
});

Deno.test("message-send-location: maps accuracy and live period onto snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: {} } }]);
  await action.execute(
    { chatId: "1", latitude: 0, longitude: 0, horizontalAccuracy: 50, livePeriod: 600 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.horizontal_accuracy, 50);
  assertEquals(body.live_period, 600);
});

Deno.test("message-send-location: constrains latitude/longitude to real ranges", () => {
  const lat = action.params?.find((p) => p.key === "latitude");
  const lon = action.params?.find((p) => p.key === "longitude");
  assertEquals(lat?.validation, { min: -90, max: 90 });
  assertEquals(lon?.validation, { min: -180, max: 180 });
});
