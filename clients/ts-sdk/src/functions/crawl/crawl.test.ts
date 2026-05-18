import { beforeAll, describe, expectTypeOf } from "vitest";
import { TrieveSDK } from "../../sdk";
import { CrawlRequest } from "../../types.gen";
import { TRIEVE } from "../../__tests__/constants";
import { test } from "../../__tests__/utils";

describe("Crawl Tests", async () => {
  let trieve: TrieveSDK;
  beforeAll(() => {
    trieve = TRIEVE;
  });

  test("getCrawlsForDataset", async () => {
    const data = await trieve.getCrawlsForDataset({
      page: 1,
      limit: 10,
    });

    expectTypeOf(data).toEqualTypeOf<Array<CrawlRequest>>();
  });
});
