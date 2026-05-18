import { beforeAll, describe, expectTypeOf } from "vitest";
import { TrieveSDK } from "../../sdk";
import {
  Dataset,
  DatasetAndUsage,
  DatasetQueueLengthsResponse,
  DatasetUsageCount,
  GetAllTagsResponse,
} from "../../types.gen";
import { TRIEVE } from "../../__tests__/constants";
import { test } from "../../__tests__/utils";

describe("Dataset Tests", async () => {
  let trieve: TrieveSDK;
  beforeAll(() => {
    trieve = TRIEVE;
  });

  test("getDatasetById", async () => {
    const data = await trieve.getDatasetById(trieve.datasetId!);
    expectTypeOf(data).toEqualTypeOf<Dataset>();
  });

  test("getDatasetUsageById", async () => {
    const data = await trieve.getDatasetUsageById(trieve.datasetId!);
    expectTypeOf(data).toEqualTypeOf<DatasetUsageCount>();
  });

  test("getDatasetsFromOrganization", async () => {
    const data = await trieve.getDatasetsFromOrganization(
      trieve.organizationId!,
    );
    expectTypeOf(data).toEqualTypeOf<DatasetAndUsage[]>();
  });

  test("getAllDatasetTags", async () => {
    const data = await trieve.getAllDatasetTags(
      {
        page: 1,
      },
      trieve.datasetId!,
    );
    expectTypeOf(data).toEqualTypeOf<GetAllTagsResponse>();
  });

  test("getDatasetQueueLengths", async () => {
    const data = await trieve.getDatasetQueueLengths(trieve.datasetId!);
    expectTypeOf(data).toEqualTypeOf<DatasetQueueLengthsResponse>();
  });
});
