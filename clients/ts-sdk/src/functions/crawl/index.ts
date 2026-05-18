/**
 * This includes all the functions you can use to communicate with our crawl endpoint
 *
 * @module Crawl Methods
 */

import { TrieveSDK } from "../../sdk";
import {
  $OpenApiTs,
  CreateCrawlReqPayload,
  CrawlRequest,
  GetCrawlRequestsForDatasetData,
} from "../../types.gen";

/**
 * Function that retrieves all crawl requests for the current dataset, with optional pagination.
 *
 * Example:
 * ```js
 * const crawls = await trieve.getCrawlsForDataset({
 *   page: 1,
 *   limit: 10,
 * });
 * ```
 */
export async function getCrawlsForDataset(
  /** @hidden */
  this: TrieveSDK,
  props: Omit<GetCrawlRequestsForDatasetData, "trDataset"> = {},
  signal?: AbortSignal,
): Promise<Array<CrawlRequest>> {
  if (!this.datasetId) {
    throw new Error("Dataset ID is required to get crawls");
  }

  return this.trieve.fetch<"eject">(
    `/api/crawl?limit=${props.limit ?? 10}&page=${
      props.page ?? 1
    }` as keyof $OpenApiTs,
    "get",
    {
      datasetId: this.datasetId,
    },
    signal,
  ) as Promise<Array<CrawlRequest>>;
}

/**
 * Function that creates a new crawl request for the current dataset.
 *
 * Example:
 * ```js
 * const crawl = await trieve.createCrawl({
 *   crawl_options: {
 *     site_url: "https://example.com",
 *   },
 * });
 * ```
 */
export async function createCrawl(
  /** @hidden */
  this: TrieveSDK,
  props: CreateCrawlReqPayload,
  signal?: AbortSignal,
): Promise<CrawlRequest> {
  if (!this.datasetId) {
    throw new Error("Dataset ID is required to create a crawl");
  }

  return this.trieve.fetch(
    "/api/crawl",
    "post",
    {
      data: props,
      datasetId: this.datasetId,
    },
    signal,
  ) as Promise<CrawlRequest>;
}
