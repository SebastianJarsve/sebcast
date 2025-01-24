# tools

A collection of small convenient dev tools

## Add tool

A new tool should be added in a single file in `./src/commands/`. This is the template to use:

```ts
import {Detail} from '@raycast/api'

function CommandTemplate() {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Extract params" onSubmit={form.handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a URL to parse and extract the GET params." />
      <Form.TextField id="url" title="URL" placeholder="URL" />
      <Form.TextArea id="params" title="Params" placeholder="Params" enableMarkdown={true} />
    </Form>
  );
}

CommandTemplate.displayName = "Command name";
CommandTemplate.description = "Command description";
CommandTemplate.icon = Icon.WrenchScrewdriver;

export default ExtractGetParams;
```

Note it's important to set displayName, description and Icon.

