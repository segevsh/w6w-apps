import { need } from "./client.ts";
import campaignContactsList from "../actions/campaign-contacts-list.ts";
import templateList from "../actions/template-list.ts";
import type { HookContext } from "@w6w/types";

/** Largest page either paged endpoint accepts (templates and campaign contacts: 1-50). */
export const PAGE = 50;
/** At most 20 requests (1000 rows) per check; a larger collection throws instead of truncating. */
export const MAX_PAGES = 20;

const rows = (res: unknown): unknown[] => {
  const data = (res as { data?: unknown } | undefined)?.data;
  return Array.isArray(data) ? data : [];
};

/** Every template, `page` 1.. until `supplementalData.hasMore` is false. */
export async function allTemplates(ctx: HookContext): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await templateList.execute({ limit: PAGE, page }, ctx);
    out.push(...rows(res));
    const more = (res as { supplementalData?: { hasMore?: boolean } }).supplementalData?.hasMore;
    if (!more) return out;
  }
  throw new Error(`Seamless.AI: more than ${PAGE * MAX_PAGES} templates; cannot snapshot them`);
}

/** Every contact enrolled in one campaign, `offset` 0.. until `pagination.hasMore` is false. */
export async function allCampaignContacts(
  ctx: HookContext,
  campaignId: unknown,
): Promise<unknown[]> {
  const id = need(campaignId as string | undefined, "Campaign ID");
  const out: unknown[] = [];
  for (let n = 0; n < MAX_PAGES; n++) {
    const res = await campaignContactsList.execute({ id, limit: PAGE, offset: n * PAGE }, ctx);
    out.push(...rows(res));
    const more = (res as { pagination?: { hasMore?: boolean } }).pagination?.hasMore;
    if (!more) return out;
  }
  throw new Error(
    `Seamless.AI: more than ${PAGE * MAX_PAGES} contacts in campaign ${
      String(id)
    }; cannot snapshot them`,
  );
}
