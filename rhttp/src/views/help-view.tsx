import { List, environment } from "@raycast/api";
import { parseHelpMarkdown } from "~/utils/markdown-parser";
import fs from "fs";
import path from "path";

export function HelpView() {
  // Read from assets directory
  const helpContent = fs.readFileSync(path.join(environment.assetsPath, "help.md"), "utf-8");

  const sections = parseHelpMarkdown(helpContent);

  return (
    <List navigationTitle="Help & Documentation" isShowingDetail>
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item key={item.title} title={item.title} detail={<List.Item.Detail markdown={item.content} />} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
