import type { AppDefinition } from "@w6w/types";
import viewer from "./actions/viewer-get.ts";
import event from "./actions/event-get.ts";
import events from "./actions/events-list.ts";
import tickets from "./actions/tickets-list.ts";
import orders from "./actions/orders-list.ts";
import returns from "./actions/returns-list.ts";
import extras from "./actions/extras-list.ts";
import transfers from "./actions/ticket-transfers-list.ts";
import genres from "./actions/genre-types-list.ts";
import graphql from "./actions/graphql-query.ts";
import token from "./auth/api-token.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newOrder from "./triggers/new-order.ts";
import newReturn from "./triggers/new-return.ts";
import newTicketTransfer from "./triggers/new-ticket-transfer.ts";

export default {
  actions: [viewer, event, events, tickets, orders, returns, extras, transfers, genres, graphql],
  triggers: [newOrder, newReturn, newTicketTransfer],
  auth: [token],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
