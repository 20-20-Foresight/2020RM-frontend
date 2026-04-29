import React from "react";
import { RegexBuilder } from "./index";

export default {
  title: "Molecules/RegexBuilder",
  component: RegexBuilder,
};

export function Empty() {
  return <RegexBuilder />;
}

export function SimplePhrase() {
  return <RegexBuilder initialPhrase="Real Estate LLC" />;
}

export function WithAlternation() {
  return (
    <RegexBuilder
      initialTokens={[
        { id: "1", type: "literal", value: "Real", optional: false },
        { id: "2", type: "literal", value: "Estate", optional: false },
        {
          id: "3",
          type: "alternation",
          options: ["LLC", "L.L.C.", "Limited Liability Company"],
          optional: false,
        },
      ]}
    />
  );
}

export function WithOptional() {
  return (
    <RegexBuilder
      initialTokens={[
        { id: "1", type: "literal", value: "The", optional: true },
        { id: "2", type: "literal", value: "Blackstone", optional: false },
        {
          id: "3",
          type: "alternation",
          options: ["Group", "Real Estate", "Fund"],
          optional: false,
        },
      ]}
    />
  );
}

export function CompanyNameMatcher() {
  return (
    <RegexBuilder
      initialTokens={[
        {
          id: "1",
          type: "alternation",
          options: ["Brookfield", "Blackstone", "KKR"],
          optional: false,
        },
        {
          id: "2",
          type: "alternation",
          options: ["Asset Management", "Real Estate", "Infrastructure"],
          optional: true,
        },
        {
          id: "3",
          type: "alternation",
          options: ["LLC", "LP", "Inc"],
          optional: true,
        },
      ]}
    />
  );
}
