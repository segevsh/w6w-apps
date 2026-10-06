import { assertEquals, assertRejects } from "@std/assert";
import orderStageUpdate from "../../actions/order-stage-update.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("order-stage-update: PUTs /orderstages/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await orderStageUpdate.execute(
    { "id": 7, "name": "Prospect 3", "probability": 75 },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/orderstages/7`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { "name": "Prospect 3", "probability": 75 });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("order-stage-update: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await orderStageUpdate.execute(
    {
      "id": 7,
      "name": "Prospect 3",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "Prospect 3");
});

Deno.test("order-stage-update: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await orderStageUpdate.execute(
    { "id": 7, "name": "Prospect 3", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("order-stage-update: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await orderStageUpdate.execute({ "id": 7, "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("order-stage-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await orderStageUpdate.execute({ id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("order-stage-update: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await orderStageUpdate.execute({ "id": 7, "name": "Prospect 3", "probability": 75 }, ctx),
    Error,
    "401",
  );
});

Deno.test("order-stage-update: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await orderStageUpdate.execute({ "id": 7, "name": "Prospect 3", "probability": 75 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
