import React from "react";
import { Box, VStack, Text } from "@chakra-ui/react";
import { MilestoneChevrons } from "./MilestoneChevrons";

const ES_MILESTONES = [
  { key: "pre-search",    label: "Pre-Search",       shortLabel: "PRE-SEARCH" },
  { key: "research",      label: "Research & ID",     shortLabel: "RESEARCH"  },
  { key: "sourcing",      label: "Sourcing",          shortLabel: "SOURCING"  },
  { key: "screening",     label: "Screening",         shortLabel: "SCREENING" },
  { key: "presentations", label: "Presentations",     shortLabel: "PRESENTS"  },
  { key: "deep-dive",     label: "Deep Dive",         shortLabel: "DEEP DIVE" },
  { key: "offer",         label: "Offer Negotiation", shortLabel: "OFFER"     },
  { key: "placed",        label: "Placed",            shortLabel: "PLACED"    },
  { key: "follow-up",     label: "Post-Placement",    shortLabel: "FOLLOW-UP" },
];

const EM_MILESTONES = [
  { key: "intake",     label: "Intake & Assessment", shortLabel: "INTAKE"     },
  { key: "program",    label: "Program Setup",       shortLabel: "PROGRAM"    },
  { key: "coaching",   label: "Active Coaching",     shortLabel: "COACHING"   },
  { key: "outreach",   label: "Client Outreach",     shortLabel: "OUTREACH"   },
  { key: "placement",  label: "Placement",           shortLabel: "PLACEMENT"  },
  { key: "onboarding", label: "Onboarding Support",  shortLabel: "ONBOARDING" },
  { key: "closeout",   label: "Close Out",           shortLabel: "CLOSE OUT"  },
];

function LabeledBar({ label, children }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={1}>{label}</Text>
      {children}
    </Box>
  );
}

export default {
  title: "Molecules/MilestoneChevrons",
  component: MilestoneChevrons,
};

export function ESSizes() {
  return (
    <VStack align="stretch" spacing={6} p={4} maxW="640px">
      <LabeledBar label="size=lg — active: Sourcing (index 2)">
        <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={2} size="lg" />
      </LabeledBar>
      <LabeledBar label="size=md — active: Presentations (index 4)">
        <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={4} size="md" />
      </LabeledBar>
      <LabeledBar label="size=sm — active: Offer (index 6)">
        <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={6} size="sm" />
      </LabeledBar>
    </VStack>
  );
}

export function EMPhases() {
  return (
    <VStack align="stretch" spacing={6} p={4} maxW="560px">
      <LabeledBar label="Active Coaching (index 2)">
        <MilestoneChevrons milestones={EM_MILESTONES} activeIndex={2} size="md" />
      </LabeledBar>
      <LabeledBar label="Placement (index 4)">
        <MilestoneChevrons milestones={EM_MILESTONES} activeIndex={4} size="md" />
      </LabeledBar>
    </VStack>
  );
}

export function Extremes() {
  return (
    <VStack align="stretch" spacing={6} p={4} maxW="560px">
      <LabeledBar label="First phase active (index 0)">
        <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={0} size="md" />
      </LabeledBar>
      <LabeledBar label="Last phase active (index 8)">
        <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={8} size="md" />
      </LabeledBar>
      <LabeledBar label="Single phase">
        <MilestoneChevrons milestones={[{ key: "only", label: "Only Phase", shortLabel: "ONLY" }]} activeIndex={0} size="md" />
      </LabeledBar>
    </VStack>
  );
}
