import { Box, Text, Tooltip } from "@chakra-ui/react";

const BRAND_RED = "#D72638";
const GREEN_DONE = "#276749";

/**
 * Compute background color per chevron.
 * Completed = green, active = red, future = dark→light gray gradient.
 */
function chevronBg(i, total, activeIndex) {
  if (i < activeIndex) return GREEN_DONE;
  if (i === activeIndex) return BRAND_RED;
  const shade = Math.round(45 + (i / Math.max(total - 1, 1)) * 110);
  return `rgb(${shade},${shade},${shade})`;
}

function chevronTextColor(i, total, activeIndex) {
  if (i <= activeIndex) return "white";
  const shade = Math.round(45 + (i / Math.max(total - 1, 1)) * 110);
  return shade < 120 ? "white" : "#D8D8D8";
}

/**
 * Chevron-shaped milestone progress bar.
 * Chevrons overlap so only the V-notch provides visual separation — no gap.
 * Colors graduate from dark gray (left) to lighter gray (right) for future phases.
 *
 * @param {{
 *   milestones: Array<{key: string, label: string, shortLabel: string}>,
 *   activeIndex: number,
 *   size?: "sm" | "md" | "lg"
 * }} props
 */
export function MilestoneChevrons({ milestones, activeIndex, size = "md" }) {
  const n = milestones.length;
  const hPx = size === "sm" ? 26 : size === "lg" ? 40 : 34;
  const notch = size === "sm" ? 10 : size === "lg" ? 15 : 13;
  const showText = size !== "sm";
  const textPx = size === "lg" ? 11 : 10;

  return (
    <Box position="relative" w="full" h={`${hPx}px`}>
      {milestones.map((milestone, i) => {
        const isFirst = i === 0;
        const isLast = i === n - 1;
        const bg = chevronBg(i, n, activeIndex);
        const textColor = chevronTextColor(i, n, activeIndex);
        const widthPct = 100 / n;
        const extraPx = isLast ? 0 : notch;

        let clip;
        if (n === 1) {
          clip = "none";
        } else if (isFirst) {
          clip = `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`;
        } else if (isLast) {
          clip = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${notch}px 50%)`;
        } else {
          clip = `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%, ${notch}px 50%)`;
        }

        const plPx = isFirst ? 8 : notch + 4;
        const prPx = isLast ? 8 : notch + 4;

        return (
          <Tooltip key={milestone.key} label={milestone.label} placement="top" hasArrow>
            <Box
              position="absolute"
              top={0}
              left={`${i * widthPct}%`}
              h="100%"
              bg={bg}
              zIndex={i}
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="default"
              style={{
                width: `calc(${widthPct}% + ${extraPx}px)`,
                clipPath: clip,
                paddingLeft: `${plPx}px`,
                paddingRight: `${prPx}px`,
              }}
            >
              {showText && (
                <Text
                  style={{ fontSize: `${textPx}px` }}
                  color={textColor}
                  fontWeight="bold"
                  noOfLines={1}
                  letterSpacing="0.04em"
                >
                  {milestone.shortLabel}
                </Text>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
