import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-individual-reveal.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("get-individual-reveal: GETs by id and returns the data member", async () => {
  const data = {
    id: 7,
    status: "finished",
    is_complete: true,
    email: "a@b.co",
    email_status: "valid",
  };
  const { ctx, calls } = mockCtx([{
    body: { status: { code: 200, message: "OK" }, type: "individual_reveal", data },
  }]);
  const out = await exec(action, { id: 7 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/individual_reveals/7");
  assertEquals(out, data);
});

Deno.test("get-individual-reveal: a billing failure is a 200 and surfaces as a failed record", async () => {
  const data = { id: 8, status: "failed", is_complete: true, fail_error: "billing_issue" };
  const { ctx } = mockCtx([{ body: { status: { code: 200 }, data } }]);
  const out = await exec(action, { id: "8" }, ctx);
  assertEquals(out.fail_error, "billing_issue");
});

Deno.test("get-individual-reveal: rejects a non-numeric id before any request; 404 fails", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: "../lists" }, none.ctx), Error, "numeric");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: { status: { code: 404, message: "Not found" } } }]);
  await assertRejects(() => exec(action, { id: 9 }, ctx), Error, "Not found");
});
