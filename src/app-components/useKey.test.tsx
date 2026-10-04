// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useKey } from "./useKey";

afterEach(cleanup);

function Harness({ keyName, onKey, children }: { keyName: string; onKey: () => void; children?: React.ReactNode }) {
  useKey(keyName, onKey);
  return <>{children}</>;
}

const press = (target: EventTarget, key: string) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

describe("useKey", () => {
  it("handles key events whose target is the window, not an element", () => {
    const onKey = vi.fn();
    render(<Harness keyName="Enter" onKey={onKey} />);
    press(window, "Enter");
    expect(onKey).toHaveBeenCalledTimes(1);
  });

  it("ignores keys typed into form fields", () => {
    const onKey = vi.fn();
    const { getByRole } = render(
      <Harness keyName="d" onKey={onKey}>
        <input aria-label="name" />
      </Harness>,
    );
    press(getByRole("textbox"), "d");
    expect(onKey).not.toHaveBeenCalled();
  });

  it("leaves Enter on a button to the button itself", () => {
    const onKey = vi.fn();
    const { getByRole } = render(
      <Harness keyName="Enter" onKey={onKey}>
        <button type="button">Go</button>
      </Harness>,
    );
    press(getByRole("button"), "Enter");
    expect(onKey).not.toHaveBeenCalled();
  });
});
