/**
 * Markdown renderer component for AI responses.
 * Uses react-markdown with remark-gfm for GitHub Flavored Markdown support.
 */
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && match) {
              const text = String(children).replace(/\n$/, "");
              return (
                <div className="relative group">
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg !bg-gray-900 !text-gray-100 text-sm overflow-x-auto"
                    {...props}
                  >
                    {text}
                  </SyntaxHighlighter>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
                    title="Copy code to clipboard"
                    aria-label="Copy code to clipboard"
                  >
                    Copy
                  </button>
                </div>
              );
            }

            // Inline code or code blocks without language
            return (
              <code
                className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Links open in new tab
          a({ href, children, ...props }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Preserve line breaks
          p({ children, ...props }: any) {
            return (
              <p className="mb-2 last:mb-0" {...props}>
                {children}
              </p>
            );
          },
          // Lists with proper spacing
          ul({ children, ...props }: any) {
            return (
              <ul className="mb-2 ml-6 list-disc space-y-1" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }: any) {
            return (
              <ol className="mb-2 ml-6 list-decimal space-y-1" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }: any) {
            return (
              <li className="pl-1" {...props}>
                {children}
              </li>
            );
          },
          // Headings with hierarchy
          h1({ children, ...props }: any) {
            return (
              <h1 className="text-2xl font-bold mt-4 mb-2 first:mt-0" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }: any) {
            return (
              <h2 className="text-xl font-bold mt-4 mb-2 first:mt-0" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }: any) {
            return (
              <h3 className="text-lg font-semibold mt-3 mb-2 first:mt-0" {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }: any) {
            return (
              <h4 className="text-base font-semibold mt-3 mb-1 first:mt-0" {...props}>
                {children}
              </h4>
            );
          },
          h5({ children, ...props }: any) {
            return (
              <h5 className="text-sm font-semibold mt-2 mb-1 first:mt-0" {...props}>
                {children}
              </h5>
            );
          },
          h6({ children, ...props }: any) {
            return (
              <h6 className="text-sm font-medium mt-2 mb-1 first:mt-0 text-gray-700" {...props}>
                {children}
              </h6>
            );
          },
          // Blockquotes
          blockquote({ children, ...props }: any) {
            return (
              <blockquote
                className="border-l-4 border-gray-300 pl-4 py-2 my-2 italic text-gray-700 bg-gray-50 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Horizontal rules
          hr({ ...props }: any) {
            return (
              <hr className="my-4 border-gray-300" {...props} />
            );
          },
          // Strong (bold)
          strong({ children, ...props }: any) {
            return (
              <strong className="font-semibold" {...props}>
                {children}
              </strong>
            );
          },
          // Emphasis (italic)
          em({ children, ...props }: any) {
            return (
              <em className="italic" {...props}>
                {children}
              </em>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

