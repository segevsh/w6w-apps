import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

test("contact-get: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactGet.execute({ "contactId": 7, "includeUtms": true } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/detail");
  assertEquals(queryOf(calls[0].url), { "contactId": "7", "includeUtms": "true" });
  assertEquals(out, REPLY);
});

test("contact-get: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactGet.execute({ "contactId": 7 } as never, ctx);

  assertEquals(queryOf(calls[0].url), { "contactId": "7" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("contact-get: declares a read-only shape", () => {
  assertEquals(contactGet.type, "read");
  assertEquals(contactGet.idempotent, undefined);
  assertEquals(contactGet.params!.filter((p) => p.required).map((p) => p.key), ["contactId"]);
});
