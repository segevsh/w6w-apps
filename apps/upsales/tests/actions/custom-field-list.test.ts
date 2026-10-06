import { assertEquals, assertRejects } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("custom-field-list: GETs /customfields/{entity}", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 3 }], 1) }]);
  const out = (await customFieldList.execute({ entity: "account" }, ctx)) as {
    data: unknown[];
    total: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/customfields/account`);
  assertEquals(out.data, [{ id: 3 }]);
  assertEquals(out.total, 1);
});

Deno.test("custom-field-list: every declared option is an accepted entity", async () => {
  const options = (customFieldList.params![0] as { options: Array<{ value: string }> }).options;
  assertEquals(options.length, 10);
  for (const o of options) {
    const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
    await customFieldList.execute({ entity: o.value }, ctx);
    assertEquals(calls[0].url, `${API_ROOT}/customfields/${o.value}`);
  }
});

Deno.test("custom-field-list: an unknown entity is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await customFieldList.execute({ entity: "../users" }, ctx),
    Error,
    "entity must be",
  );
  assertEquals(calls.length, 0);
});

Deno.test("custom-field-list: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () => await customFieldList.execute({ entity: "account" }, ctx),
    Error,
    "401",
  );
});

Deno.test("custom-field-list: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await customFieldList.execute({ entity: "account" }, ctx),
    Error,
    "ThrottleLimit",
  );
});
