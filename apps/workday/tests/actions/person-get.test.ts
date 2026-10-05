import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-get.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };

Deno.test("person-get: calls the documented URL and returns the record", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "a3f1c2d4e5b6478990a1b2c3d4e5f607", descriptor: "Ana Lopez" },
  }], D);
  const result = await action.execute(
    { "personId": "a3f1c2d4e5b6478990a1b2c3d4e5f607" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/person/v4/acme_impl1/people/a3f1c2d4e5b6478990a1b2c3d4e5f607",
  );
  assertEquals(result.record, { id: "a3f1c2d4e5b6478990a1b2c3d4e5f607", descriptor: "Ana Lopez" });
});

Deno.test("person-get: an ID is required and is validated before any call", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "is required");
  assertEquals(calls.length, 0);
});

Deno.test("person-get: a 404 carries Workday's error text", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Resource not found" } }], D);
  await assertRejects(
    async () => await action.execute({ "personId": "a3f1c2d4e5b6478990a1b2c3d4e5f607" }, ctx),
    Error,
    "Resource not found",
  );
});
