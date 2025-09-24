import { List } from "@raycast/api";

// Store our help content in a structured array
const helpTopics = [
  {
    title: "Anatomy of a Perfect Language Card",
    content: `
# Anatomy of a Perfect Language Card

For language learning, context is everything. Instead of just a word and its translation, try this format for a much stronger memory link:

- **Front**: The word in the language you're learning (e.g., \`el coche\`).
- **Back**: The translation, an example sentence, and the translation of the sentence (e.g., \`The car. *El coche es rojo.* (The car is red)\`).
    `,
  },
  {
    title: "Use the #reversed Tag for Fluency",
    content: `
# Use the #reversed Tag for Fluency

There are two skills in language learning: Understanding (comprehension) and speaking (production). You can practice both!

- **Comprehension Card (Default)**: \`Spanish -> Your Language\`
- **Production Card (Reversed)**: \`Your Language -> Spanish\`

To create a production card, simply reverse the front and back content and add the **\`#reversed\`** tag. You can do this quickly in the Card Form by pressing **\`⌘\`**+**\`⇧\`**+**\`P\`**.
    `,
  },
  {
    title: "Master the Review Shortcuts",
    content: `
# Master the Review Shortcuts

Use the number keys for lightning-fast reviews:
- **\`1\`**: Good (Default)
- **\`2\`**: Easy
- **\`3\`**: Hard
- **\`4\`**: Again (Forgot)
    `,
  },
];

export default function HelpListView() {
  return (
    <List isShowingDetail={true} navigationTitle="Help Guide">
      {helpTopics.map((topic) => (
        <List.Item key={topic.title} title={topic.title} detail={<List.Item.Detail markdown={topic.content} />} />
      ))}
    </List>
  );
}
