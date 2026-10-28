import { assertEquals } from "@std/assert";
import audienceSegmentCreate from "../../actions/audience-segment-create.ts";
import { createdResponse, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("audience-segment-create: POSTs with destinations pinned to LINKEDIN and the account URN", async () => {
  const { ctx, calls } = mockCtx([createdResponse("11204")]);
  const result = await audienceSegmentCreate.execute(
    { accountId: "516848833", name: "DMP Segment 1", type: "USER", sourcePlatform: "PARTNER_API" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.account, "urn:li:sponsoredAccount:516848833");
  assertEquals(body.destinations, [{ destination: "LINKEDIN" }]);
  assertEquals(body.name, "DMP Segment 1");
  assertEquals(body.type, "USER");
  assertEquals(body.sourcePlatform, "PARTNER_API");
  assertEquals(result, { id: "11204" });
});

Deno.test("audience-segment-create: description and sourceSegmentId are included only when set", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await audienceSegmentCreate.execute(
    {
      accountId: "1",
      name: "S",
      type: "COMPANY",
      sourcePlatform: "DIRECT_API",
      sourceSegmentId: "ext-1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sourceSegmentId, "ext-1");
  assertEquals("description" in body, false);
});

Deno.test("audience-segment-create: is not idempotent", () => {
  assertEquals(audienceSegmentCreate.idempotent, false);
});
