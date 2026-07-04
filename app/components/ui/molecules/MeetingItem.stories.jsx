import React from "react";
import { VStack } from "@chakra-ui/react";
import { MeetingItem } from "./MeetingItem";

export default {
  title: "Molecules/MeetingItem",
  component: MeetingItem,
};

export function Types() {
  return (
    <VStack align="stretch" spacing={2} maxW="360px">
      <MeetingItem meeting={{ id: "1", time: "9:00 AM",  title: "Candidate Call: Alexandra Grant",     type: "call",     duration: "30 min" }} />
      <MeetingItem meeting={{ id: "2", time: "12:00 PM", title: "Team Standup",                        type: "internal", duration: "30 min" }} />
      <MeetingItem meeting={{ id: "3", time: "2:00 PM",  title: "Search Review: Nexus CEO Offer",      type: "meeting",  duration: "60 min" }} />
    </VStack>
  );
}

export function LongTitle() {
  return (
    <VStack align="stretch" spacing={2} maxW="360px">
      <MeetingItem meeting={{ id: "4", time: "3:30 PM", title: "Deep-Dive Debrief and Candidate Review Session with Hiring Manager", type: "call", duration: "45 min" }} />
    </VStack>
  );
}
