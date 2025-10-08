// src/components/ErrorDetail.tsx
import { Action, ActionPanel, Detail } from "@raycast/api";
import { z } from "zod";

interface ErrorDetailProps {
  error: z.ZodError;
}

export function ErrorDetail({ error }: ErrorDetailProps) {
  console.error(error);
  // Format the Zod issues into a Markdown list
  const markdown = `# Validation Error 🚨
We found some issues with the data you entered:

\`\`\`json
${error}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error Message" content={markdown} />
        </ActionPanel>
      }
    />
  );
}
