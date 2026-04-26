import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RelationMultiSelect } from "@/ui/components/RelationMultiSelect";
import { RelationSingleSelect } from "@/ui/components/RelationSingleSelect";
import type { RelationOption } from "@/ui/relationOptions";

const options: RelationOption[] = [
  {
    id: "function_capture",
    label: "Capture feature intent",
    type: "Function",
    description: "Collect the raw idea",
  },
];

describe("relation selectors", () => {
  it("renders selected labels instead of only raw IDs", () => {
    const markup = renderToStaticMarkup(
      <RelationMultiSelect
        id="functions"
        label="Functions"
        value={["function_capture"]}
        options={options}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Capture feature intent");
    expect(markup).toContain("Function");
  });

  it("keeps missing multi-select IDs visible", () => {
    const markup = renderToStaticMarkup(
      <RelationMultiSelect
        id="functions"
        label="Functions"
        value={["function_capture", "missing_function"]}
        options={options}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Missing IDs still selected");
    expect(markup).toContain("missing_function");
  });

  it("keeps missing single-select IDs visible", () => {
    const markup = renderToStaticMarkup(
      <RelationSingleSelect
        id="source"
        label="Source entity"
        value="missing_entity"
        options={options}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Missing ID still selected");
    expect(markup).toContain("missing_entity");
  });
});
