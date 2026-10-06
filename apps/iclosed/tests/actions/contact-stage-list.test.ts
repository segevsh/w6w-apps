import { assertEquals } from "@std/assert";
import contactStageList from "../../actions/contact-stage-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("contact-stage-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactStageList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/fields/contact-stage");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, REPLY);
});

Deno.test("contact-stage-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactStageList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-stage-list: declares a read-only shape", () => {
  assertEquals(contactStageList.type, "read");
  assertEquals(contactStageList.idempotent, undefined);
  assertEquals(contactStageList.params!.filter((p) => p.required).map((p) => p.key), []);
});
