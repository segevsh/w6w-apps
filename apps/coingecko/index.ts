/**
 * CoinGecko — crypto prices, market data, charts, search, trending, global data and
 * exchanges over the v3 API.
 *
 * Verified 2026-10-06 against CoinGecko's own OpenAPI document
 * (`docs.coingecko.com/openapi-specs/pro-api.json`, v3.0.0) plus live probes of
 * `api.coingecko.com`, `pro-api.coingecko.com` and `status.coingecko.com`.
 */
import type { AppDefinition } from "@w6w/types";
import demoApiKey from "./auth/demo-api-key.ts";
import proApiKey from "./auth/pro-api-key.ts";

import ping from "./actions/ping.ts";
import getApiUsage from "./actions/get-api-usage.ts";
import getSimplePrice from "./actions/get-simple-price.ts";
import listSupportedCurrencies from "./actions/list-supported-currencies.ts";
import listCoins from "./actions/list-coins.ts";
import listCoinMarkets from "./actions/list-coin-markets.ts";
import getCoin from "./actions/get-coin.ts";
import getCoinHistory from "./actions/get-coin-history.ts";
import getCoinMarketChart from "./actions/get-coin-market-chart.ts";
import getCoinMarketChartRange from "./actions/get-coin-market-chart-range.ts";
import getCoinOhlc from "./actions/get-coin-ohlc.ts";
import search from "./actions/search.ts";
import getTrending from "./actions/get-trending.ts";
import getGlobal from "./actions/get-global.ts";
import listExchanges from "./actions/list-exchanges.ts";
import listExchangeIds from "./actions/list-exchange-ids.ts";
import listCategories from "./actions/list-categories.ts";
import listCategoryIds from "./actions/list-category-ids.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    ping,
    getApiUsage,
    getSimplePrice,
    listSupportedCurrencies,
    listCoins,
    listCoinMarkets,
    getCoin,
    getCoinHistory,
    getCoinMarketChart,
    getCoinMarketChartRange,
    getCoinOhlc,
    search,
    getTrending,
    getGlobal,
    listExchanges,
    listExchangeIds,
    listCategories,
    listCategoryIds,
  ],
  auth: [demoApiKey, proApiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
