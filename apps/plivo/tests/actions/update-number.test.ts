import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, json, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-number.ts";

Deno.test("update-number: POSTs the changed fields to Number/{number}/", async () => {
  const body = { api_id: "a", message: "changed" };
  const { ctx, calls } = mockCtx([{ status: 202, body }], CONN);
  const out = await action.execute!(
    { number: "17609915566", appId: "99", alias: "Main Line", cnam: "ACME" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, BASE + "Number/17609915566/");
  assertEquals(json(calls[0]), { app_id: "99", alias: "Main Line", cnam: "ACME" });
  assertEquals(out, body);
});

Deno.test("update-number: subaccount transfer and CNAM lookup use documented names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], CONN);
  await action.execute!({ number: "1", subaccount: "SA1", cnamLookup: "disabled" }, ctx);
  assertEquals(json(calls[0]), { subaccount: "SA1", cnam_lookup: "disabled" });
});

Deno.test("update-number: blank number refused; vendor error thrown", async () => {
  await assertRejects(
    async () => await action.execute!({ number: "" }, mockCtx([], CONN).ctx),
    Error,
    "required",
  );
  const { ctx } = mockCtx([{ status: 400, body: "bad" }], CONN);
  await assertRejects(
    async () => await action.execute!({ number: "1", alias: "x" }, ctx),
    Error,
    "Plivo 400",
  );
});
