// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./dashboard-client";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Jadwal Hari Ini" value={3} />);
    expect(screen.getByText("Jadwal Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders a string value as-is", () => {
    render(<StatCard label="Status" value="Aktif" />);
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });
});
