import { assertEquals } from "@std/assert";
import callLogList from "../../actions/call-log-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("call-log-list: hits the extension call-log collection", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await callLogList.execute({}, ctx) as { records: unknown[] };

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~/call-log");
  assertEquals(out.records.length, 1);
});

Deno.test("call-log-list: direction/type repeat the query key", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await callLogList.execute({ direction: ["Inbound", "Outbound"], type: ["Voice"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "direction"), ["Inbound", "Outbound"]);
  assertEquals(queryAllOf(calls[0].url, "type"), ["Voice"]);
});

Deno.test("call-log-list: sends recordingType, not the deprecated withRecording", () => {
  const keys = (callLogList.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("recordingType"), true);
  assertEquals(keys.includes("withRecording"), false);
});

Deno.test("call-log-list: phoneNumber hint documents the no-leading-plus format", () => {
  const phoneNumber = callLogList.params?.find((p) => p.key === "phoneNumber");
  assertEquals(phoneNumber?.placeholder, "12053320032");
});

Deno.test("call-log-list: view defaults to Simple and is sent through", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await callLogList.execute({ view: "Detailed" }, ctx);
  assertEquals(queryOf(calls[0].url).view, "Detailed");
});
