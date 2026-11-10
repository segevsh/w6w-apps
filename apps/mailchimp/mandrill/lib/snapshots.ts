import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { HookContext } from "@w6w/types";
import listTemplates from "../actions/list-templates.ts";

/**
 * `POST /templates/list.json` returns every template of the account in one array (the endpoint
 * takes no paging parameters: https://mailchimp.com/developer/transactional/api/templates/list/),
 * so the whole list is compared each check, keyed by the template's immutable `slug`.
 */
export async function pollTemplates(state: unknown, ctx: HookContext) {
  const result = await listTemplates.execute({}, ctx);
  const items = Array.isArray(result) ? result : [];
  return await pollSnapshot({
    state,
    rows: items.map((t) => ({ key: String((t as { slug?: unknown }).slug ?? ""), values: t })),
    emit: { added: true, updated: false },
  });
}
