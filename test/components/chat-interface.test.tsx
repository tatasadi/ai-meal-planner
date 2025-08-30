import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ChatInterface } from "@/components/chat/chat-interface"
import type { ChatMessage } from "@/lib/types"

// Mock sanitization
vi.mock("@/lib/sanitization", () => ({
  sanitizeChatMessage: vi.fn((msg: string) => msg),
}))

describe("ChatInterface Component", () => {
  const mockMessages: ChatMessage[] = [
    {
      id: "msg-1",
      userId: "test-user",
      mealPlanId: "test-plan",
      role: "user",
      content: "Make this lighter",
      timestamp: new Date(),
    },
    {
      id: "msg-2",
      userId: "test-user", 
      mealPlanId: "test-plan",
      role: "assistant",
      content: "I'll make this lighter by reducing the portions",
      timestamp: new Date(),
    },
  ]

  const mockOnSendMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render empty state when no messages", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    expect(screen.getByText("Ask me to modify your meal plan!")).toBeInTheDocument()
    expect(screen.getByText('Try: "Make the lunch lighter" or "I don\'t like salmon"')).toBeInTheDocument()
  })

  it("should render messages correctly", () => {
    render(
      <ChatInterface
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
      />
    )

    expect(screen.getByText("Make this lighter")).toBeInTheDocument()
    expect(screen.getByText("I'll make this lighter by reducing the portions")).toBeInTheDocument()
  })

  it("should handle message submission", async () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const input = screen.getByPlaceholderText("Ask me to modify your meals...")
    const submitButton = screen.getByRole("button")

    fireEvent.change(input, { target: { value: "Make lunch healthier" } })
    fireEvent.click(submitButton)

    expect(mockOnSendMessage).toHaveBeenCalledWith("Make lunch healthier")
    expect(input).toHaveValue("") // Input should be cleared
  })

  it("should disable input and button when loading", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isLoading={true}
      />
    )

    const input = screen.getByPlaceholderText("Ask me to modify your meals...")
    const submitButton = screen.getByRole("button")

    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it("should show loading indicator when loading", () => {
    render(
      <ChatInterface
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        isLoading={true}
      />
    )

    // Check for loading dots
    const loadingDots = document.querySelectorAll(".animate-bounce")
    expect(loadingDots).toHaveLength(3)
  })

  it("should show error message when error occurs", () => {
    const mockError = new Error("Test error")

    render(
      <ChatInterface
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        error={mockError}
      />
    )

    expect(screen.getByText("Sorry, I encountered an error. Please try again.")).toBeInTheDocument()
  })

  it("should not submit empty messages", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const submitButton = screen.getByRole("button")
    fireEvent.click(submitButton)

    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it("should not submit when loading", () => {
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isLoading={true}
      />
    )

    const input = screen.getByPlaceholderText("Ask me to modify your meals...")
    const submitButton = screen.getByRole("button")

    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.click(submitButton)

    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it("should sanitize input before sending", async () => {
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(sanitizeChatMessage as any).mockReturnValue("sanitized message")

    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const input = screen.getByPlaceholderText("Ask me to modify your meals...")
    const submitButton = screen.getByRole("button")

    fireEvent.change(input, { target: { value: "<script>alert('test')</script>" } })
    fireEvent.click(submitButton)

    expect(sanitizeChatMessage).toHaveBeenCalledWith("<script>alert('test')</script>")
    expect(mockOnSendMessage).toHaveBeenCalledWith("sanitized message")
  })

  it("should handle form submission with Enter key", async () => {
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(sanitizeChatMessage as any).mockReturnValue("Test message")
    
    render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const input = screen.getByPlaceholderText("Ask me to modify your meals...")
    const form = input.closest("form")!
    
    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.submit(form)

    expect(mockOnSendMessage).toHaveBeenCalledWith("Test message")
  })

  it("should display user and assistant messages with correct styling", async () => {
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(sanitizeChatMessage as any).mockImplementation((msg: string) => msg)
    
    render(
      <ChatInterface
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
      />
    )

    const userMessage = screen.getByText("Make this lighter").closest("div")?.parentElement?.parentElement
    const assistantMessage = screen.getByText("I'll make this lighter by reducing the portions").closest("div")?.parentElement?.parentElement

    // User messages should be right-aligned
    expect(userMessage?.className).toContain("justify-end")
    // Assistant messages should be left-aligned  
    expect(assistantMessage?.className).toContain("justify-start")
  })

  it("should auto-scroll to bottom when messages change", async () => {
    const mockScrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView

    const { rerender } = render(
      <ChatInterface
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    // Add a message
    rerender(
      <ChatInterface
        messages={[mockMessages[0]]}
        onSendMessage={mockOnSendMessage}
      />
    )

    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" })
    })
  })
})