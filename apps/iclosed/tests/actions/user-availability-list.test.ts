import { assertEquals } from "@std/assert";
import userAvailabilityList from "../../actions/user-availability-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("user-availability-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await userAvailabilityList.execute({ "userId": 7 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/userAvailabilities");
  assertEquals(queryOf(calls[0].url), { "userId": "7" });
  assertEquals(out, REPLY);
});

Deno.test("user-availability-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await userAvailabilityList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("user-availability-list: declares a read-only shape", () => {
  assertEquals(userAvailabilityList.type, "read");
  assertEquals(userAvailabilityList.idempotent, undefined);
  assertEquals(userAvailabilityList.params!.filter((p) => p.required).map((p) => p.key), []);
});
