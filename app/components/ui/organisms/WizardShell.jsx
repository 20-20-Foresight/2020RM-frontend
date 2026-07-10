import React from "react";
import { Box, Button, HStack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Tooltip } from "@chakra-ui/react";

/**
 * Generic multi-step wizard shell: a tab strip, scrollable step content, and
 * a permanent bottom bar with Previous/Next controls. Each step can be
 * individually disabled (e.g. gated by permission) — advancing into a
 * disabled step is blocked and explained via `disabledHint`.
 * @param {{
 *   steps: Array<{key: string, label: string, isDisabled?: boolean, disabledHint?: string}>,
 *   activeIndex: number,
 *   onActiveIndexChange: (index: number) => void,
 *   isNextDisabled?: boolean,
 *   nextDisabledHint?: string,
 *   contentHeight?: string,
 *   children: React.ReactNode
 * }} props
 */
export function WizardShell({
  steps,
  activeIndex,
  onActiveIndexChange,
  isNextDisabled = false,
  nextDisabledHint = "",
  contentHeight = "56vh",
  children,
}) {
  const panels = React.Children.toArray(children);
  const isLastStep = activeIndex === steps.length - 1;
  const nextStep = steps[activeIndex + 1];
  const nextBlockedByStep = Boolean(nextStep?.isDisabled);
  const nextBlocked = isNextDisabled || nextBlockedByStep;
  const nextHint = nextBlockedByStep ? nextStep?.disabledHint : nextDisabledHint;

  function handleTabChange(index) {
    if (steps[index]?.isDisabled) {
      return;
    }
    onActiveIndexChange(index);
  }

  function handlePrevious() {
    onActiveIndexChange(Math.max(0, activeIndex - 1));
  }

  function handleNext() {
    if (nextBlocked || isLastStep) {
      return;
    }
    onActiveIndexChange(activeIndex + 1);
  }

  return (
    <Box display="flex" flexDirection="column" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Tabs index={activeIndex} onChange={handleTabChange} display="flex" flexDirection="column" flex="1" minH={0}>
        <TabList px={4} flexShrink={0}>
          {steps.map((step) => (
            <Tab key={step.key} isDisabled={step.isDisabled} fontSize="sm">
              {step.label}
            </Tab>
          ))}
        </TabList>

        <Box flex="1" minH={0} overflowY="auto" height={contentHeight} px={5} py={5}>
          <TabPanels>
            {panels.map((panel, index) => (
              <TabPanel key={steps[index]?.key || index} p={0}>
                {panel}
              </TabPanel>
            ))}
          </TabPanels>
        </Box>
      </Tabs>

      <HStack
        justify="space-between"
        px={5}
        py={3}
        borderTopWidth="1px"
        borderColor="gray.200"
        bg="gray.50"
        flexShrink={0}
      >
        <Button variant="ghost" onClick={handlePrevious} isDisabled={activeIndex === 0}>
          Previous
        </Button>
        <Text fontSize="xs" color="gray.500">
          Step {activeIndex + 1} of {steps.length}
        </Text>
        {isLastStep ? (
          <Box w="90px" />
        ) : (
          <Tooltip label={nextBlocked ? nextHint : ""} isDisabled={!nextBlocked || !nextHint}>
            <Box>
              <Button colorScheme="blue" onClick={handleNext} isDisabled={nextBlocked}>
                Next
              </Button>
            </Box>
          </Tooltip>
        )}
      </HStack>
    </Box>
  );
}
