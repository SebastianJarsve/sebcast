import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast } from "@raycast/api";
import { useState } from "react";

function StringLength() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Extract params (json)"
            onAction={async () => {
              await Clipboard.copy(data);
              showHUD("Copied params (json)");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Your string is ${data.length} character${data.length !== 1}s long.`} />
      <Form.TextArea id="string" title="String" placeholder="String..." value={data} onChange={setData} />
    </Form>
  );
}

StringLength.displayName = "Get string length";
StringLength.description = "Gets the length of a given string";
StringLength.icon = Icon.Text;

export default StringLength;
