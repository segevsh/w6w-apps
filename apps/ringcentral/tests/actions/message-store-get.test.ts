import { assertEquals } from "@std/assert";
import messageStoreGet from "../../actions/message-store-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-store-get: builds the single-message path, not the bulk form", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 8930983240, type: "SMS" } }]);
  const out = await messageStoreGet.execute({ messageId: "8930983240" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(
    pathOf(calls[0].url),
    "/restapi/v1.0/account/~/extension/~/message-store/8930983240",
  );
  assertEquals(out.type, "SMS");
});

Deno.test("message-store-get: messageId is required and does not fall back to ~", () => {
  const param = messageStoreGet.params?.find((p) => p.key === "messageId");
  assertEquals(param?.required, true);
  assertEquals(param?.default, undefined);
});
