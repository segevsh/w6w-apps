import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/user-suspend.ts";

Deno.test("user-suspend: PUTs the id-keyed admin route", async () => {
  const { ctx, calls } = mockDiscourseCtx([{
    body: { suspension: { suspended_till: "2121-02-22" } },
  }]);
  await action.execute({ userId: 9, suspendUntil: "2121-02-22", reason: "spam" }, ctx);
  // Admin routes are keyed on the numeric id; the public /u/ routes are keyed
  // on username. That split is Discourse's.
  assertEquals(calls[0].url, `${SITE_URL}/admin/users/9/suspend.json`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { suspend_until: "2121-02-22", reason: "spam" });
});

Deno.test("user-suspend: omitting `message` means no email is sent", async () => {
  // Discourse's reference: `message` "Will send an email with this message when
  // present". Sending mail to a community member by accident is not recoverable,
  // so a blank field must never become an empty-string message.
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ userId: 1, suspendUntil: "2030-01-01", reason: "r", message: "" }, ctx);
  assertEquals("message" in JSON.parse(calls[0].body!), false);
});

Deno.test("user-suspend: a supplied message is forwarded, and the form says it emails", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { userId: 1, suspendUntil: "2030-01-01", reason: "r", message: "See the FAQ." },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, "See the FAQ.");
  const param = action.params!.find((p) => p.key === "message")!;
  assert(/send/i.test(param.hint!));
});

Deno.test("user-suspend: both of the endpoint's required fields are required here", () => {
  assertEquals(
    action.params!.filter((p) => p.required).map((p) => p.key),
    ["userId", "suspendUntil", "reason"],
  );
});

Deno.test("user-suspend: post_action passes through under its API name", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { userId: 1, suspendUntil: "2030-01-01", reason: "r", postAction: "delete" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).post_action, "delete");
});
