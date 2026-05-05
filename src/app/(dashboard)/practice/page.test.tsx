import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  CommandItem: ({
    children,
    onSelect,
    ...props
  }: HTMLAttributes<HTMLButtonElement> & { onSelect?: () => void }) => (
    <button type="button" onClick={() => onSelect?.()} {...props}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@sentry/nextjs", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  captureException: vi.fn(),
}));

import PracticeLibraryPage from "./page";

function jsonResponse(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: init?.headers,
    })
  );
}

function fillRequiredPitchFields() {
  fireEvent.change(screen.getByPlaceholderText(/AI outbound assistant/i), {
    target: { value: "AI outbound assistant" },
  });
  fireEvent.change(screen.getByPlaceholderText(/B2B SaaS companies/i), {
    target: { value: "B2B SaaS companies" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Low reply rates/i), {
    target: { value: "Low reply rates" },
  });
  fireEvent.change(screen.getByPlaceholderText(/2x meeting conversion/i), {
    target: { value: "2x meeting conversion" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Get commitment for a 2-week pilot/i), {
    target: { value: "Get commitment for a 2-week pilot" },
  });
}

function createFetchMock(options?: {
  personasHeaders?: Record<string, string>;
  scenariosBody?: unknown;
}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/personas") {
      return jsonResponse(
        [
          {
            id: "persona-1",
            name: "Alex Morgan",
            title: "VP Sales",
            description: "Friendly but direct.",
            emoji: "🙂",
            persona_type: "friendly",
            accent: "",
          },
        ],
        { headers: options?.personasHeaders }
      );
    }

    if (url === "/api/voice/active-session") {
      return jsonResponse({ hasActiveSession: false });
    }

    if (url.startsWith("/api/scenarios?")) {
      return jsonResponse(options?.scenariosBody ?? [
        {
          id: "scenario-1",
          title: "Product Pitch - Easy",
          description: "",
          callType: "pitch",
          difficulty: "easy",
        },
      ]);
    }

    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
}

describe("PracticeLibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal("fetch", createFetchMock());
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("does not fetch scenarios on load and resolves the scenario on Next", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeLibraryPage />);

    await screen.findByText("Practice Library");

    const initialUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(initialUrls).toContain("/api/personas");
    expect(initialUrls).toContain("/api/voice/active-session");
    expect(initialUrls).not.toContain("/api/scenarios");
    expect(screen.queryByText("Showing the first 100 personas.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Easy" }));
    fillRequiredPitchFields();
    fireEvent.click(screen.getByRole("button", { name: /Surprise Me/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));

    await screen.findByText("Pre-Mission Briefing");

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(
      "/api/scenarios?call_type=pitch&difficulty=easy"
    );
  });

  it("shows a persona truncation warning only when the response headers say results were truncated", async () => {
    vi.stubGlobal(
      "fetch",
      createFetchMock({
        personasHeaders: {
          "X-Result-Limit": "100",
          "X-Results-Truncated": "true",
        },
      })
    );

    render(<PracticeLibraryPage />);

    expect(await screen.findByText("Showing the first 100 personas.")).toBeInTheDocument();
  });

  it("keeps the existing no-scenario-found error when the filtered lookup returns no matches", async () => {
    vi.stubGlobal("fetch", createFetchMock({ scenariosBody: [] }));

    render(<PracticeLibraryPage />);

    await screen.findByText("Practice Library");

    fireEvent.click(screen.getByRole("button", { name: "Easy" }));
    fillRequiredPitchFields();
    fireEvent.click(screen.getByRole("button", { name: /Surprise Me/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));

    await waitFor(() => {
      expect(
        screen.getByText("No scenario found for this combination. Please try a different difficulty.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Pre-Mission Briefing")).not.toBeInTheDocument();
  });
});
