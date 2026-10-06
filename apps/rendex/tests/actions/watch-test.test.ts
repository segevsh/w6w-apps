import { assertEquals, assertRejects } from "@std/assert";
import watchTest from "../../actions/watch-test.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

const ok = () => mockCtx([{ body: envelope({ id: "w1" }) }]);

Deno.test("watch-test: POSTs /watches/test", async () => {
  const { ctx, calls } = ok();
  await watchTest.execute({ url: "https://e.com", notifyEmail: "me@e.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/watches/test");
  assertEquals(bodyOf(calls[0]), { url: "https://e.com", notifyEmail: "me@e.com" });
  await assertRejects(async () => await watchTest.execute({}, ctx), Error, "URL is required");
});
