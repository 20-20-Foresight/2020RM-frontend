import { Box, Button, Heading, Image, VStack, VisuallyHidden } from "@chakra-ui/react";
import { useSearchParams } from "@remix-run/react";
import { FaWindows } from "react-icons/fa";
const { buildAuthLoginPath } = require("../../src/auth/return-to");

export const meta = () => [{ title: "2020RM — Sign In" }];

const LOGO_URL =
  "https://www.2020foresight.com/wp-content/uploads/2023/11/2020-foresight-executive-talent-solutions-logo-inverse.webp";
const HERO_VIDEO_URL =
  "https://www.2020foresight.com/wp-content/uploads/2022/02/2020-foresight-ambient-touchpoints-v2.mp4";

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const loginHref = buildAuthLoginPath(searchParams.get("returnTo"));

  return (
    <Box minH="100vh" bg="#000000" display="flex" alignItems="center" justifyContent="center">
      <Box
        position="relative"
        w="full"
        minH={{ base: "420px", md: "520px" }}
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 8 }}
        py={{ base: 10, md: 14 }}
      >
        <Box
          as="video"
          id="hero-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          position="absolute"
          inset="0"
          w="full"
          h="full"
          objectFit="cover"
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </Box>
        <Box position="absolute" inset="0" bg="rgba(0, 0, 0, 0.45)" />
        <VStack position="relative" zIndex="1" spacing={6} w="full">
          <Image
            src={LOGO_URL}
            alt="2020 Foresight Executive Talent Solutions"
            w={{ base: "240px", md: "340px" }}
            maxW="80vw"
          />
          <Box
            bg="rgba(255, 255, 255, 0.94)"
            color="gray.900"
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            shadow="2xl"
            w="full"
            maxW="440px"
            backdropFilter="blur(6px)"
          >
            <VStack align="stretch" spacing={5}>
              <Heading size="md" textAlign="center">
                Sign In
              </Heading>
              <Button
                as="a"
                href={loginHref}
                size="lg"
                w="full"
                bg="#0078D4"
                color="white"
                leftIcon={<FaWindows />}
                _hover={{ bg: "#106EBE" }}
                _active={{ bg: "#005A9E" }}
              >
                Sign in with Microsoft
              </Button>
              <VisuallyHidden>
                After sign-in you will return to the requested page when available; otherwise the
                dashboard.
              </VisuallyHidden>
            </VStack>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
