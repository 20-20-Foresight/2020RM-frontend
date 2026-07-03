import React from "react";
import { VStack } from "@chakra-ui/react";
import { CompanyResearchQueueHistory } from "./CompanyResearchQueueHistory";

export default {
  title: "Company Research/Queue History",
  component: CompanyResearchQueueHistory,
};

const baseItems = [
  {
    key: "companyresearch.transfer",
    queueName: "companyresearch.transfer",
    label: "companyresearch.transfer",
    startedAt: "2026-07-03T09:01:00.000Z",
    completedAt: "2026-07-03T09:04:00.000Z",
    requestCount: 1,
    counts: {
      pending: 1,
      success: 0,
      failed: 0,
    },
    status: "pending",
    triageErrorIds: [],
  },
  {
    key: "recomposePerson",
    queueName: "recomposePerson",
    label: "recomposePerson",
    startedAt: "2026-07-03T09:06:00.000Z",
    completedAt: "2026-07-03T09:10:00.000Z",
    requestCount: 11,
    counts: {
      pending: 8,
      success: 2,
      failed: 1,
    },
    status: "partial_failed",
    triageErrorIds: ["recomposePerson-14-error-1"],
  },
  {
    key: "companyresearch.finalize",
    queueName: "companyresearch.finalize",
    label: "companyresearch.finalize",
    startedAt: "2026-07-03T09:12:00.000Z",
    completedAt: "2026-07-03T09:13:00.000Z",
    requestCount: 1,
    counts: {
      pending: 0,
      success: 1,
      failed: 0,
    },
    status: "success",
    triageErrorIds: [],
  },
];

export function MixedRun() {
  return (
    <VStack align="stretch" spacing={4}>
      <CompanyResearchQueueHistory
        items={baseItems}
        onJumpToError={() => {}}
      />
    </VStack>
  );
}

export function Empty() {
  return <CompanyResearchQueueHistory items={[]} />;
}

export function Loading() {
  return <CompanyResearchQueueHistory items={[]} isLoading />;
}
