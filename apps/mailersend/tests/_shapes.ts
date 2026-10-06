/**
 * Test shapes for the three action families built by `lib/factories.ts`. Each asserts the
 * verb, the exact path (including the URL-encoding of the id), the absence of any
 * credential header, and what comes back.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import type { ActionDefinition } from "@w6w/types";
import { exec, mockCtx, pathOf } from "./_helpers.ts";

// deno-lint-ignore no-explicit-any
type Act = ActionDefinition<any>;

export function testGetById(
  name: string,
  action: Act,
  idKey: string,
  expectedPath: string,
) {
  Deno.test(`${name}: GETs ${expectedPath} and returns the vendor body verbatim`, async () => {
    const body = { data: { id: "abc123", name: "x" } };
    const { ctx, calls } = mockCtx([{ body }]);
    const out = await exec(action, { [idKey]: "abc123" }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "GET");
    assertEquals(pathOf(calls[0].url), expectedPath.replace("{id}", "abc123"));
    assertEquals(out, body);
    assert(!("authorization" in calls[0].headers), "sign injects credentials, not actions");
  });
  Deno.test(`${name}: encodes the id as one path segment`, async () => {
    const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
    await exec(action, { [idKey]: "a/b c" }, ctx);
    assertEquals(new URL(calls[0].url).pathname, expectedPath.replace("{id}", "a%2Fb%20c"));
  });
  Deno.test(`${name}: a 404 surfaces the vendor message with the status`, async () => {
    const { ctx } = mockCtx([{ status: 404, body: { message: "Resource not found." } }]);
    const err = await assertRejects(() => exec(action, { [idKey]: "nope" }, ctx));
    assert(String(err).includes("404") && String(err).includes("Resource not found."));
  });
  Deno.test(`${name}: is a read action with a required id param`, () => {
    assertEquals(action.type, "read");
    assertEquals(action.params!.find((p) => p.key === idKey)?.required, true);
  });
}

export function testDeleteById(
  name: string,
  action: Act,
  idKey: string,
  expectedPath: string,
  status = 204,
) {
  Deno.test(`${name}: DELETEs ${expectedPath} and reports deleted`, async () => {
    const { ctx, calls } = mockCtx([{ status, body: undefined }]);
    const out = await exec(action, { [idKey]: "abc123" }, ctx);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(pathOf(calls[0].url), expectedPath.replace("{id}", "abc123"));
    assertEquals(calls[0].body, null, "a delete sends no body");
    assertEquals(out, { deleted: true });
  });
  Deno.test(`${name}: a 404 is an error, not a silent success`, async () => {
    const { ctx } = mockCtx([{ status: 404, body: { message: "Resource not found." } }]);
    await assertRejects(() => exec(action, { [idKey]: "gone" }, ctx), Error, "404");
  });
  Deno.test(`${name}: is a non-idempotent perform action`, () => {
    assertEquals(action.type, "perform");
    assertEquals(action.idempotent, false);
  });
}
