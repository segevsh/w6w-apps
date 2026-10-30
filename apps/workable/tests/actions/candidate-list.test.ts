import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-list.ts";

test("candidate-list: GETs /candidates account-wide when no filter is given", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates");
});

test("candidate-list: narrows by job shortcode and stage", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [{ id: "c1" }] } }]);
  const out = await action.execute({ shortcode: "GROOV005", stage: "applied" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.workable.com/spi/v3/candidates?shortcode=GROOV005&stage=applied",
  );
  assertEquals(out, { candidates: [{ id: "c1" }], nextUrl: undefined });
});

test("candidate-list: pageUrl bypasses every other filter", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [] } }]);
  const nextUrl = "https://acme.workable.com/spi/v3/candidates?since_id=abc";
  await action.execute({ pageUrl: nextUrl, email: "ignored@example.com" }, ctx);
  assertEquals(calls[0].url, nextUrl);
});
