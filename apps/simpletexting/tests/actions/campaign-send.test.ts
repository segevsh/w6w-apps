import { assertEquals, assertRejects } from "@std/assert";
import campaignSend from "../../actions/campaign-send.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("campaign-send: POSTs the schema's fields, not the vendor's prose example", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "507f191e810c19729de860ea" } }]);
  const result = await campaignSend.execute(
    {
      title: "Spring sale",
      messageMode: "AUTO",
      messageText: "20% off today!",
      listIds: ["My First List"],
      segmentIds: ["507f191e810c19729de860ea"],
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/campaigns`);
  assertEquals(bodyOf(calls[0]), {
    title: "Spring sale",
    listIds: ["My First List"],
    segmentIds: ["507f191e810c19729de860ea"],
    messageTemplate: { mode: "AUTO", text: "20% off today!" },
  });
  assertEquals(result.id, "507f191e810c19729de860ea");
});

/** A campaign with nobody to send to is refused here, before a 500 from the vendor. */
Deno.test("campaign-send: refuses an empty audience before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignSend.execute(
        { title: "x", messageMode: "AUTO", messageText: "hi" },
        ctx,
      ),
    Error,
    "audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-send: a list alone is a sufficient audience", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "x" } }]);
  await campaignSend.execute(
    { title: "x", messageMode: "AUTO", messageText: "hi", listIds: ["My First List"] },
    ctx,
  );
  assertEquals(calls.length, 1);
});

Deno.test("campaign-send: is not idempotent — no idempotency key, and the cost is per recipient", () => {
  assertEquals(campaignSend.idempotent, false);
});
