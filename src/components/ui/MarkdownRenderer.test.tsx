import React from "react";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders basic markdown, inline code, and links", () => {
    const markdown = "Hello `code` and [link](https://example.com)";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a fenced code block with syntax highlighting", () => {
    const markdown = "```ts\nconst x: number = 1;\n```";

    render(<MarkdownRenderer content={markdown} />);

    // The highlighted code text should be present
    expect(screen.getByText("const x: number = 1;")).toBeInTheDocument();

    // Copy button should be present for code blocks
    const copyButton = screen.getByRole("button", {
      name: /copy code to clipboard/i,
    });
    expect(copyButton).toBeInTheDocument();
  });

  it("renders bullet lists correctly", () => {
    const markdown = "- Item 1\n- Item 2\n- Item 3";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders numbered lists correctly", () => {
    const markdown = "1. First item\n2. Second item\n3. Third item";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
    expect(screen.getByText("Third item")).toBeInTheDocument();
  });

  it("renders nested lists correctly", () => {
    const markdown = "- Parent\n  - Child 1\n  - Child 2\n- Another parent";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Another parent")).toBeInTheDocument();
  });

  it("renders bold text correctly", () => {
    const markdown = "This is **bold** text";

    render(<MarkdownRenderer content={markdown} />);

    const boldElement = screen.getByText("bold");
    expect(boldElement).toBeInTheDocument();
    expect(boldElement.tagName).toBe("STRONG");
  });

  it("renders italic text correctly", () => {
    const markdown = "This is *italic* text";

    render(<MarkdownRenderer content={markdown} />);

    const italicElement = screen.getByText("italic");
    expect(italicElement).toBeInTheDocument();
    expect(italicElement.tagName).toBe("EM");
  });

  it("renders bold italic text correctly", () => {
    const markdown = "This is ***bold italic*** text";

    render(<MarkdownRenderer content={markdown} />);

    const boldItalicElement = screen.getByText("bold italic");
    expect(boldItalicElement).toBeInTheDocument();
  });

  it("renders headings correctly", () => {
    const markdown = "# H1 Heading\n## H2 Heading\n### H3 Heading";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole("heading", { name: "H1 Heading", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H2 Heading", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H3 Heading", level: 3 })).toBeInTheDocument();
  });

  it("renders all heading levels correctly", () => {
    const markdown = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole("heading", { name: "H1", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H2", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H3", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H4", level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H5", level: 5 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "H6", level: 6 })).toBeInTheDocument();
  });

  it("renders blockquotes correctly", () => {
    const markdown = "> This is a blockquote";

    render(<MarkdownRenderer content={markdown} />);

    const blockquote = screen.getByText("This is a blockquote");
    expect(blockquote).toBeInTheDocument();
    expect(blockquote.closest("blockquote")).toBeInTheDocument();
  });

  it("renders horizontal rules correctly", () => {
    const markdown = "Text above\n---\nText below";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("Text above")).toBeInTheDocument();
    expect(screen.getByText("Text below")).toBeInTheDocument();
    // Horizontal rule should be present (rendered as <hr>)
    const hr = document.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("renders paragraphs with proper spacing", () => {
    const markdown = "First paragraph.\n\nSecond paragraph.";

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders links with proper security attributes", () => {
    const markdown = "[Example](https://example.com)";

    render(<MarkdownRenderer content={markdown} />);

    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders complex markdown with multiple features", () => {
    const markdown = `# Heading

This is a paragraph with **bold** and *italic* text.

- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

> This is a blockquote

[Link text](https://example.com)

---

More text here.`;

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByText("italic")).toBeInTheDocument();
    expect(screen.getByText("Bullet item 1")).toBeInTheDocument();
    expect(screen.getByText("Numbered item 1")).toBeInTheDocument();
    expect(screen.getByText("This is a blockquote")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link text" })).toBeInTheDocument();
    expect(screen.getByText("More text here.")).toBeInTheDocument();
  });
});


