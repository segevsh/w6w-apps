import { assert, assertEquals, assertRejects } from "@std/assert";
import responseTag from "../../actions/response-tag.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-tag: POSTs uuid and a tags array to /v1/responses/tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await responseTag.execute({ uuid: "r1", tags: "first, second" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/responses/tags");
  assertEquals(JSON.parse(calls[0].body!), { uuid: "r1", tags: ["first", "second"] });
});

Deno.test("response-tag: accepts an array and rejects empty and over-20 lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await responseTag.execute({ uuid: "r1", tags: ["x"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["x"]);
  await assertRejects(
    () => Promise.resolve(responseTag.execute({ uuid: "r1", tags: " , " }, ctx)),
    Error,
    "at least one tag",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        responseTag.execute(
          { uuid: "r1", tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
          ctx,
        ),
      ),
    Error,
    "at most 20",
  );
  assertEquals(calls.length, 1);
});

Deno.test("response-tag: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(responseTag.execute({ uuid: "r1", tags: "a" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
