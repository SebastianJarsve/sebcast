import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast } from "@raycast/api";
import { useState } from "react";

function ExtractGetParams() {
  const [url, setUrl] = useState("");
  const [params, setParams] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Extract params (json)"
            onAction={async () => {
              await Clipboard.copy(params);
              showHUD("Copied params (json)");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a URL to parse and extract the GET params." />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="URL"
        value={url}
        onChange={(value) => {
          setUrl(value);
          try {
            const uri = new URL(value);
            showToast({ title: uri.toString() });
            const params = JSON.stringify(Object.fromEntries(uri.searchParams));
            setParams(params);
          } catch (e) {}
        }}
      />
      <Form.TextArea
        id="params"
        title="Params"
        placeholder="Params"
        enableMarkdown={true}
        value={params}
        onChange={setParams}
      />
    </Form>
  );
}

ExtractGetParams.displayName = "Extract Get Params";
ExtractGetParams.description = "Extracts GET parameters from a given URL.";
ExtractGetParams.icon = Icon.Hammer;

export default ExtractGetParams;
