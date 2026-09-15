import { assertEquals } from "@std/assert";
import loggedTimeGet from "../../actions/logged-time-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-get - GETs /logged-time/{id} with the STRING id URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { logged_time_id: "5e38963be429adc74664c777", hours: 5.25 },
  }]);
  const out = await loggedTimeGet.execute({ logged_time_id: "5e38963be429adc74664c777" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/logged-time/5e38963be429adc74664c777");
  assertEquals(out, { logged_time_id: "5e38963be429adc74664c777", hours: 5.25 });
});
