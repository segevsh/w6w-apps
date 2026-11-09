import type { AppDefinition } from "@w6w/types";
import identify from "./actions/identify.ts";
import del from "./actions/delete.ts";
import track from "./actions/track.ts";
import trackAnonymous from "./actions/track-anonymous.ts";
import segmentAdd from "./actions/add-to-segment.ts";
import segmentRemove from "./actions/remove-from-segment.ts";
import merge from "./actions/merge.ts";
import basic from "./auth/basic.ts";
import reportingEvent from "./triggers/reporting-event.ts";
import emailOpened from "./triggers/email-opened.ts";
import emailClicked from "./triggers/email-clicked.ts";
import customerUnsubscribed from "./triggers/customer-unsubscribed.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [identify, del, track, trackAnonymous, segmentAdd, segmentRemove, merge],
  triggers: [reportingEvent, emailOpened, emailClicked, customerUnsubscribed],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
