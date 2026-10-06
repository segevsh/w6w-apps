import { assertEquals } from "@std/assert";
import prefs from "../../actions/stream-preferences-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("stream-preferences-list: returns streamprefs", async () => {
  const streamprefs = { "user/1/label/MIT": [{ id: "is-expanded", value: "true" }] };
  const { ctx, calls } = mockCtx([{ body: { streamprefs } }]);
  assertEquals(await prefs.execute({}, ctx), { streamprefs });
  assertEquals(pathOf(calls[0].url), "/reader/api/0/preference/stream/list");
});

Deno.test("stream-preferences-list: absent streamprefs becomes {}", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await prefs.execute({}, ctx), { streamprefs: {} });
});
