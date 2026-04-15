import React from "react";
import { Text } from "@chakra-ui/react";
import { LabeledContentBlock } from "./LabeledContentBlock";

export default {
  title: "Molecules/LabeledContentBlock",
  component: LabeledContentBlock
};

export function Default() {
  return (
    <LabeledContentBlock label="Description:">
      <Text>This is a content block used inside editor cards.</Text>
    </LabeledContentBlock>
  );
}

export function Empty() {
  return <LabeledContentBlock label="Examples:" emptyText="No examples yet" />;
}
