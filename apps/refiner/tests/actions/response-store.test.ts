import { assert, assertEquals, assertRejects } from "@std/assert";
import responseStore from "../../actions/response-store.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-store: POSTs answers flat beside form_uuid and the user", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok", uuid: "r1" } }]);
  const out = await responseStore.execute(
    {
      formUuid: "f1",
      id: "u1",
      answers: { nps_question: 9, comment: "Great" },
      date: "2026-01-02",
      preventDuplicates: false,
      tags: "a, b",
      account: { id: "acme" },
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/responses");
  assertEquals(JSON.parse(calls[0].body!), {
    nps_question: 9,
    comment: "Great",
    id: "u1",
    form_uuid: "f1",
    date: "2026-01-02",
    prevent_duplicates: false,
    tags: ["a", "b"],
    account: { id: "acme" },
  });
  assertEquals(out, { message: "ok", uuid: "r1" });
});

Deno.test("response-store: prevent_duplicates is omitted unless turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await responseStore.execute({ formUuid: "f1", email: "a@b.co", preventDuplicates: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co", form_uuid: "f1" });
});

Deno.test("response-store: reserved keys in answers are refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        responseStore.execute({ formUuid: "f1", id: "u1", answers: { form_uuid: "x" } }, ctx),
      ),
    Error,
    "reserved key",
  );
  assertEquals(calls.length, 0);
});

Deno.test("response-store: needs a user identifier and at most 20 tags", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(responseStore.execute({ formUuid: "f1" }, ctx)),
    Error,
    "provide one of",
  );
  const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
  await assertRejects(
    () => Promise.resolve(responseStore.execute({ formUuid: "f1", id: "u1", tags }, ctx)),
    Error,
    "at most 20",
  );
  assertEquals(calls.length, 0);
});

Deno.test("response-store: is not idempotent", () => assertEquals(responseStore.idempotent, false));

Deno.test("response-store: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(responseStore.execute({ formUuid: "f1", id: "u1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
