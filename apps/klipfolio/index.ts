import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import datasourceList from "./actions/datasource-list.ts";
import datasourceGet from "./actions/datasource-get.ts";
import datasourceCreate from "./actions/datasource-create.ts";
import datasourceUpdate from "./actions/datasource-update.ts";
import datasourceDelete from "./actions/datasource-delete.ts";
import datasourceEnable from "./actions/datasource-enable.ts";
import datasourceDisable from "./actions/datasource-disable.ts";
import datasourceRefreshMany from "./actions/datasource-refresh-many.ts";
import datasourceInstanceList from "./actions/datasource-instance-list.ts";
import datasourceInstanceGet from "./actions/datasource-instance-get.ts";
import datasourceInstanceRefresh from "./actions/datasource-instance-refresh.ts";
import datasourceInstanceDataGet from "./actions/datasource-instance-data-get.ts";
import klipList from "./actions/klip-list.ts";
import klipGet from "./actions/klip-get.ts";
import klipCreate from "./actions/klip-create.ts";
import klipUpdate from "./actions/klip-update.ts";
import klipDelete from "./actions/klip-delete.ts";
import klipClientInstanceList from "./actions/klip-client-instance-list.ts";
import dashboardList from "./actions/dashboard-list.ts";
import dashboardGet from "./actions/dashboard-get.ts";
import dashboardCreate from "./actions/dashboard-create.ts";
import dashboardUpdate from "./actions/dashboard-update.ts";
import dashboardDelete from "./actions/dashboard-delete.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";
import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";
import clientDelete from "./actions/client-delete.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";
import groupUserList from "./actions/group-user-list.ts";
import groupUserAdd from "./actions/group-user-add.ts";
import groupUserRemove from "./actions/group-user-remove.ts";
import profileGet from "./actions/profile-get.ts";

export default {
  actions: [
    datasourceList,
    datasourceGet,
    datasourceCreate,
    datasourceUpdate,
    datasourceDelete,
    datasourceEnable,
    datasourceDisable,
    datasourceRefreshMany,
    datasourceInstanceList,
    datasourceInstanceGet,
    datasourceInstanceRefresh,
    datasourceInstanceDataGet,
    klipList,
    klipGet,
    klipCreate,
    klipUpdate,
    klipDelete,
    klipClientInstanceList,
    dashboardList,
    dashboardGet,
    dashboardCreate,
    dashboardUpdate,
    dashboardDelete,
    userList,
    userGet,
    userCreate,
    userUpdate,
    userDelete,
    clientList,
    clientGet,
    clientCreate,
    clientUpdate,
    clientDelete,
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    groupUserList,
    groupUserAdd,
    groupUserRemove,
    profileGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
