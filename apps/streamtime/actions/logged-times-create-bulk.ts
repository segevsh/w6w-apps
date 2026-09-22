import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `POST /logged_times/bulk` — log many entries in one request.
 *
 * The body is `{ "loggedTimes": [ LoggedTime, … ] }`, and the response is an
 * array of the created entries **in the documented order** — so a batch of
 * week-shaped entries can be correlated with what came back. Each element is the
 * same `LoggedTime` model `logged-time-create` sends, including the read-only
 * fields it omits.
 *
 * The entries are passed through as JSON rather than as a repeated nested form:
 * the model has ten fields, five of them read-only, and repeating that form
 * twenty times to log a week is a worse interface than one array a caller builds
 * from their own timesheet data. See the README on why this action is the one
 * JSON-array body in the app.
 */
interface Input {
  loggedTimes: unknown[];
}

const loggedTimesCreateBulk: ActionDefinition<Input> = {
  key: "logged-times-create-bulk",
  type: "perform",
  resource: "logged-time",
  title: "Create Logged Times (Bulk)",
  description:
    "Log up to a batch of time entries in one request. Each entry needs at least a date and " +
    "minutes, and belongs to a job or a job-item user.",
  idempotent: false,
  params: [
    {
      key: "loggedTimes",
      label: "Logged Times",
      type: "json",
      required: true,
      hint: 'Array of `LoggedTime` objects, e.g. [{"date":"2025-08-15","minutes":90,"jobId":90,"' +
        'notes":"Reviewed safety procedures","private":false}]. Writable fields: userId, ' +
        "loggedTimeStatus, date, jobId, jobItemUserId, notes, private, minutes.",
    },
  ],
  output: [{ key: "loggedTimes", type: "array", label: "The created entries, in order" }],

  async execute(input, ctx) {
    if (!Array.isArray(input.loggedTimes)) {
      throw new Error("loggedTimes must be an array of LoggedTime objects");
    }
    const loggedTimes = await new StreamtimeClient(ctx).request<unknown[]>("/logged_times/bulk", {
      method: "POST",
      body: { loggedTimes: input.loggedTimes },
    });
    return { loggedTimes: loggedTimes ?? [] };
  },
};

export default loggedTimesCreateBulk;
