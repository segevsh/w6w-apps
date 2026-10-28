import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page.ts";

Deno.test("page: posts name + userId + properties to /page", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { name: "Home", userId: "u1", properties: { url: "https://x.test" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.segment.io/v1/page");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Home",
    userId: "u1",
    properties: { url: "https://x.test" },
  });
  assertEquals(result, { success: true });
});

Deno.test("page: folds category into properties.category — no top-level category field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { userId: "u1", category: "Docs", properties: { title: "Intro" } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.category, undefined);
  assertEquals(body.properties, { title: "Intro", category: "Docs" });
});

Deno.test("page: category alone (no other properties) still lands in properties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ userId: "u1", category: "Docs" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).properties, { category: "Docs" });
});

Deno.test("page: rejects when neither userId nor anonymousId is set", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "Home" }, ctx),
    Error,
    "either `userId` or `anonymousId` is required",
  );
});
