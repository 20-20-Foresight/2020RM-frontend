import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";

const shimmer = keyframes`
  0%   { background-position: -1200px 0; }
  100% { background-position:  1200px 0; }
`;

const SHIMMER_BG =
  "linear-gradient(90deg, #EDF2F7 0%, #EDF2F7 40%, #DBE9F8 50%, #EDF2F7 60%, #EDF2F7 100%)";

export function ShimmerBox({ borderRadius = "md", ...props }) {
  return (
    <Box
      backgroundImage={SHIMMER_BG}
      backgroundSize="1200px 100%"
      animation={`${shimmer} 1.4s linear infinite`}
      borderRadius={borderRadius}
      flexShrink={0}
      {...props}
    />
  );
}
