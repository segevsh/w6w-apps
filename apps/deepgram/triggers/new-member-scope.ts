import { snapshotFeed } from "../lib/triggers.ts";
import memberScopeList from "../actions/member-scope-list.ts";

/**
 * `GET /v1/projects/{project_id}/members/{member_id}/scopes` — the scopes of ONE member the user
 * picks (`memberId`, from List Members). The response is a bare list of scope strings, so each
 * scope string is its own id and the event is `{ scope }`.
 */
export default snapshotFeed({
  key: "new-member-scope",
  title: "New Member Scope",
  description: "The run gets each scope newly granted to one Deepgram project member.",
  action: memberScopeList,
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "string",
      required: true,
      hint: "The member to watch, from List Members.",
    },
  ],
  input: (params) => ({ memberId: params.memberId }),
  items: (result) =>
    ((result as { scopes?: unknown[] }).scopes ?? []).map((scope) => ({ scope: String(scope) })),
  idOf: (item) => String(item.scope ?? ""),
  output: [{ key: "scope", type: "string", label: "Scope granted (e.g. admin, member)" }],
  sample: { scope: "admin" },
});
