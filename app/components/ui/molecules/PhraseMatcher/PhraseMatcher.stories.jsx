import React from "react";
import { PhraseMatcher } from "./index";

const setOptions = ["real estate assets", "retail"];

export default {
  title: "Molecules/PhraseMatcher",
  component: PhraseMatcher
};

export function Empty() {
  return <PhraseMatcher setOptions={setOptions} />;
}

export function SimplePhrase() {
  return <PhraseMatcher initialPhrase="management of retail" setOptions={setOptions} />;
}

export function WithAlternation() {
  return (
    <PhraseMatcher
      setOptions={setOptions}
      initialMatcher={{
        kind: "phrase-matcher",
        version: 1,
        tokens: [
          { type: "literal", value: "management" },
          { type: "literal", value: "of" },
          {
            type: "alternation",
            options: ["retail", "office", "industrial"]
          }
        ]
      }}
    />
  );
}

export function WithSetToken() {
  return (
    <PhraseMatcher
      setOptions={setOptions}
      initialMatcher={{
        kind: "phrase-matcher",
        version: 1,
        tokens: [
          { type: "literal", value: "management" },
          { type: "literal", value: "of" },
          { type: "set", setName: "real estate assets" }
        ]
      }}
    />
  );
}

export function MixedMatcher() {
  return (
    <PhraseMatcher
      setOptions={setOptions}
      initialMatcher={{
        kind: "phrase-matcher",
        version: 1,
        anchorStart: true,
        tokens: [
          { type: "literal", value: "management" },
          { type: "literal", value: "of" },
          { type: "set", setName: "real estate assets" },
          {
            type: "alternation",
            options: ["platform", "portfolio"],
            optional: true
          }
        ]
      }}
    />
  );
}

export function WithNotBlock() {
  return (
    <PhraseMatcher
      setOptions={setOptions}
      initialMatcher={{
        kind: "phrase-matcher",
        version: 1,
        tokens: [
          { type: "literal", value: "management" },
          { type: "literal", value: "of" },
          {
            type: "alternation",
            options: ["retail", "office"],
            negated: true
          }
        ]
      }}
    />
  );
}
