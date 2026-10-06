import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-datapoint.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("create-datapoint: form-posts the point and maps the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "9", timestamp: 1325523600, daystamp: "20120102", value: 130.1, comment: "hi" },
  }]);
  const out = await run(
    action,
    { slug: "w", value: 130.1, timestamp: 1325523600, comment: "hi", requestid: "r1" },
    ctx,
  );
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URLSearchParams(calls[0].body!).toString(),
    "value=130.1&timestamp=1325523600&comment=hi&requestid=r1",
  );
  assertEquals(out.id, "9");
  assertEquals(out.daystamp, "20120102");
});

Deno.test("create-datapoint: requestid defaults to the invocation id; zero is a valid value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { invocation: { invocationId: "inv-7" } });
  await run(action, { slug: "w", value: 0 }, ctx);
  assertEquals(calls[0].body, "value=0&requestid=inv-7");
});

Deno.test("create-datapoint: a missing value throws before a call; errors surface", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { slug: "w" }, none.ctx), Error, "value is required");
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 422, body: { errors: "bad value" } }]);
  await assertRejects(() => run(action, { slug: "w", value: 1 }, bad.ctx), Error, "bad value");
});
