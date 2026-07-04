import { Box, Grid, HStack, List, ListItem } from "@chakra-ui/react";
import { ShimmerBox } from "./ui/atoms/ShimmerBox";

const NAME_WIDTHS      = [160, 200, 140, 185, 220, 152, 195, 170, 145, 210];
const SECONDARY_WIDTHS = [ 90, 115,  70, 130,  80, 100, 120,  85,  95, 110];
const LOCATION_WIDTHS  = [ 90, 115,  78,  95, 130,  84, 105,  70, 118,  88];

export function DirectoryShimmer({ count = 9 }) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
      {/* Column header */}
      <Grid
        display={{ base: "none", md: "grid" }}
        templateColumns="minmax(0, 1.8fr) minmax(0, 1.1fr) 48px"
        px={4}
        py={2}
        bg="gray.50"
        borderBottomWidth="1px"
        borderColor="gray.200"
        columnGap={4}
        alignItems="center"
      >
        <ShimmerBox h="10px" w="38px" />
        <ShimmerBox h="10px" w="54px" />
        <ShimmerBox h="10px" w="28px" />
      </Grid>

      <List spacing={0}>
        {Array.from({ length: count }, (_, i) => (
          <ListItem
            key={i}
            borderBottomWidth={i === count - 1 ? "0" : "1px"}
            borderColor="gray.100"
            px={4}
            py={3}
          >
            <Grid
              templateColumns={{
                base: "minmax(0, 1fr) 40px",
                md: "minmax(0, 1.8fr) minmax(0, 1.1fr) 48px"
              }}
              templateAreas={{
                base: '"name links" "location links"',
                md: '"name location links"'
              }}
              columnGap={4}
              rowGap={2}
              alignItems="start"
            >
              <Box minW="0" gridArea="name">
                <ShimmerBox
                  h="16px"
                  w={`${NAME_WIDTHS[i % NAME_WIDTHS.length]}px`}
                  borderRadius="sm"
                />
                <ShimmerBox
                  h="13px"
                  w={`${SECONDARY_WIDTHS[i % SECONDARY_WIDTHS.length]}px`}
                  borderRadius="sm"
                  mt={2}
                />
              </Box>
              <Box minW="0" gridArea="location" pt="1px">
                <ShimmerBox
                  h="14px"
                  w={`${LOCATION_WIDTHS[i % LOCATION_WIDTHS.length]}px`}
                  borderRadius="sm"
                />
              </Box>
              <Box gridArea="links" display="flex" justifyContent="flex-end" alignItems="flex-start">
                <ShimmerBox h="20px" w="20px" borderRadius="sm" />
              </Box>
            </Grid>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
