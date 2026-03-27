import { Center, Spinner, Text, VStack } from "@chakra-ui/react";

/**
 * Renders a blocking loading state across the current viewport.
 * @param {{
 *   label: string,
 *   zIndex?: number,
 *   position?: "fixed"|"absolute",
 *   borderRadius?: string|number
 * }} props
 * @returns {JSX.Element}
 */
export function BlockingLoadingOverlay({
  label,
  zIndex = 1400,
  position = "fixed",
  borderRadius = 0
}) {
  return (
    <Center
      position={position}
      inset={0}
      zIndex={zIndex}
      bg="rgba(247, 250, 252, 0.74)"
      borderRadius={borderRadius}
    >
      <VStack spacing={3} bg="white" borderRadius="lg" shadow="xl" px={6} py={5}>
        <Spinner color="blue.500" thickness="3px" size="lg" />
        <Text fontWeight="semibold" color="gray.700">
          {label}
        </Text>
      </VStack>
    </Center>
  );
}
