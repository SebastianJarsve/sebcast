import { Form, Icon } from "@raycast/api";
import { useState } from "react";

function StringLength() {
  const [data, setData] = useState("");

  return (
    <Form>
      <Form.Description text={`Your string is ${data.length} character${data.length !== 1}s long.`} />
      <Form.TextArea id="string" title="String" placeholder="String..." value={data} onChange={setData} />
    </Form>
  );
}

StringLength.displayName = "Get string length";
StringLength.description = "Gets the length of a given string";
StringLength.icon = Icon.Text;

export default StringLength;
