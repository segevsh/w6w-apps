import { assertEquals, assertRejects } from "@std/assert";
import meetingGet from "../../actions/meeting-get.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("meeting-get: GET /v1/meetings/{uuid}/ and returns the meeting as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "m1", subject: "Demo" } }]);
  const out = await meetingGet.execute({ meetingUuid: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/meetings/m1/");
  assertEquals(out, { uuid: "m1", subject: "Demo" });
});

Deno.test("meeting-get: the uuid is URL-encoded and never sends a credential header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await meetingGet.execute({ meetingUuid: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/meetings/a%2Fb/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("meeting-get: a 404 surfaces the vendor's detail", async () => {
  const { ctx } = mockCtx([{ status: 404, body: detail("Not found.") }]);
  await assertRejects(
    async () => await meetingGet.execute({ meetingUuid: "nope" }, ctx),
    Error,
    "404: Not found.",
  );
});

Deno.test("meeting-get: a blank uuid is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await meetingGet.execute({ meetingUuid: " " }, ctx),
    Error,
    "required",
  );
});
