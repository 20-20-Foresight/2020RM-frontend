import React, { useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { WizardShell } from "./WizardShell";

export default {
  title: "Organisms/WizardShell",
  component: WizardShell
};

const STEPS = [
  { key: "one", label: "Select Recipients" },
  { key: "two", label: "Exclusions & Notes" },
  { key: "three", label: "Compose Email" },
  { key: "four", label: "Preview Email" },
  { key: "five", label: "Approve Email", isDisabled: true, disabledHint: "Only the client manager can approve" },
];

export function Default() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Box maxW="720px">
      <WizardShell steps={STEPS} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} contentHeight="240px">
        <Text>Step one content — pick a recipient list.</Text>
        <Text>Step two content — exclusions and notes.</Text>
        <Text>Step three content — compose the email.</Text>
        <Text>Step four content — preview the email.</Text>
        <Text>Step five content — approve.</Text>
      </WizardShell>
    </Box>
  );
}

export function WithNextBlocked() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Box maxW="720px">
      <WizardShell
        steps={STEPS.map((step, index) => (index === 4 ? step : { ...step, isDisabled: false }))}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        isNextDisabled={activeIndex === 0}
        nextDisabledHint="Pick a recipient list before continuing"
        contentHeight="240px"
      >
        <Text>Nothing selected yet — Next is blocked.</Text>
        <Text>Step two content.</Text>
        <Text>Step three content.</Text>
        <Text>Step four content.</Text>
        <Text>Step five content — disabled tab, since this viewer isn't the client manager.</Text>
      </WizardShell>
    </Box>
  );
}
