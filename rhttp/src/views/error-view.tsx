// src/components/ErrorDetail.tsx
import { Detail } from "@raycast/api";
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
  // ${error.issues.map((issue) => `- **${issue.path.join(".")}**: ${issue.message}`).join("\n")}
  // `;

  return <Detail markdown={markdown} />;
}
