import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * `/lead/get/{UUID}/` answers an ARRAY containing one lead — unlike
 * `/team/get/{USER_ID}`, which answers the object. The action collapses it.
 */
Deno.test("lead-get: calls GET /lead/get/{UUID}/ and collapses the one-row array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ UUID: "l1", Status: "In progress" }] }]);
  const out = await leadGet.execute({ uuid: "l1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/lead/get/l1/");
  assertEquals(out, { UUID: "l1", Status: "In progress" });
});

Deno.test("lead-get: an empty answer is null, not an empty array", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await leadGet.execute({ uuid: "nope" }, ctx), null);
});

Deno.test("lead-get: escapes the UUID path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await leadGet.execute({ uuid: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/lead/get/a%2Fb/");
});

Deno.test("lead-get: the uuid param is required", () => {
  assertEquals(leadGet.params?.find((p) => p.key === "uuid")?.required, true);
});
