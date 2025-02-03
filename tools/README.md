# tools

A collection of small convenient dev tools

## Add tool

A new tool should be added in a single file in `./src/commands/`. This is the template to use:

```ts
import { Form, Icon } from "@raycast/api";
import { useState } from "react";

function CommandTemplate() {
  const [data, setData] = useState("");

  return (
    <Form>
      <Form.Description text={`Your string is ${data.length} character${data.length !== 1}s long.`} />
      <Form.TextArea id="string" title="String" placeholder="String..." value={data} onChange={setData} />
    </Form>
  );
}
CommandTemplate.displayName = "Get string length";
CommandTemplate.description = "Gets the length of a given string";
CommandTemplate.icon = Icon.Text;

export default CommandTemplate;
```

Note it's important to set displayName, description and Icon.
