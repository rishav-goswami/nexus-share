import React from 'react';

// Helper for inline formatting
const parseInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

export const TextMessage: React.FC<{ content: string }> = ({ content }) => {
  if (!content.includes('```')) {
     return <p className="text-gray-300 whitespace-pre-wrap">{parseInlineFormatting(content)}</p>;
  }

  const parts = content.split(/```/g);

  return (
    <div className="text-gray-300">
      {parts.map((part, index) => {
        if (index % 2 === 1) { // This is a code block
          const codeLines = part.split('\n');
          const language = codeLines[0].trim().toLowerCase();
          const code = codeLines.slice(1).join('\n');
          return (
            <div key={index} className="bg-gray-900 rounded-md my-2">
              {language && <div className="text-xs text-gray-400 px-3 py-1 border-b border-gray-700">{language}</div>}
              <pre className="p-3 overflow-x-auto">
                <code className="text-sm font-mono text-cyan-300">{code.trim()}</code>
              </pre>
            </div>
          );
        } else { // This is regular text
          return <span key={index} className="whitespace-pre-wrap">{parseInlineFormatting(part)}</span>;
        }
      })}
    </div>
  );
};
