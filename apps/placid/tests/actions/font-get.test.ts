import { assertEquals } from "@std/assert";
import fontGet from "../../actions/font-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const FONT = { uuid: "f1", title: "H", filename: "h.ttf", created_at: "2026-05-06T11:24:00+00:00" };

Deno.test("font-get: GET by uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: FONT }]);
  assertEquals(await fontGet.execute({ uuid: "f1" }, ctx), FONT);
  assertEquals(pathOf(calls[0].url), "/fonts/f1");
});
