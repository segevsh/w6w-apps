import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, parseJsonObject, ZohoCreatorClient } from "../lib/client.ts";
import {
  accountOwnerName,
  appLinkName,
  demoUserName,
  environmentParam,
  formLinkName,
  messageParam,
  tasksParam,
} from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  formLinkName: string;
  data: unknown;
  message?: boolean;
  tasks?: boolean;
  environment?: string;
  demoUserName?: string;
}

interface RecordResult {
  code: number;
  data?: Record<string, unknown>;
  message?: string;
  error?: string[];
  tasks?: Record<string, unknown>;
}

interface Output {
  results: RecordResult[];
}

/**
 * `POST /creator/v2/data/<owner>/<app>/form/<form>` — Add Records. Needs
 * `ZohoCreator.form.CREATE`. Adds one record (a JSON object) — see the README for
 * adding several in one call. Verified against `add-records.html`: field values are
 * addressed by link name and every type except add-notes/formula/auto-number/
 * section/file-upload/audio/video/signature/prediction/AI fields can be set (use
 * `file-upload` for the file-bearing fields, after this action returns the new
 * record's ID).
 *
 * The response is a 200 envelope of PER-RECORD results even on partial failure —
 * `{"result":[{"code":N,"data":{...},"message"|"error":...}],"code":N}` — passed
 * through as-is rather than thrown, since a single request-level HTTP failure
 * (bad token, bad form name, ...) already throws via `lib/client.ts`.
 */
const recordAdd: ActionDefinition<Input, Output> = {
  key: "record-add",
  type: "perform",
  resource: "record",
  title: "Add Record",
  description: "Add a record to a form. `data` is field link name -> value, e.g. " +
    '{ "Email": "jason@zylker.com", "Single_Line": "hi" }.',
  idempotent: false,
  params: [
    accountOwnerName,
    appLinkName,
    formLinkName,
    {
      key: "data",
      label: "Data",
      type: "json",
      required: true,
      hint: 'JSON object of field link name -> value, e.g. { "Email": "a@b.com" }.',
    },
    messageParam,
    tasksParam,
    environmentParam,
    demoUserName,
  ],
  output: [{ key: "results", type: "array", label: "Per-record results" }],

  async execute(input, ctx) {
    const body = {
      data: parseJsonObject(input.data, "data"),
      result: {
        message: input.message ?? false,
        tasks: input.tasks ?? false,
      },
    };
    const out = await new ZohoCreatorClient(ctx).request<{ result: RecordResult[] }>(
      `/data/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/form/${encodeURIComponent(input.formLinkName)}`,
      { method: "POST", body, headers: environmentHeaders(input) },
    );
    return { results: out.result ?? [] };
  },
};

export default recordAdd;
