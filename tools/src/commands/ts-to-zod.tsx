import { Action, ActionPanel, Clipboard, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import crypto from "crypto";
import os from "os";
import path from "path";
import { useEffect } from "react";
import { generate } from "ts-to-zod";

const tmpDir = os.tmpdir?.();

type TsToZodForm = {
  keepComments: boolean;
  skipParseJSDoc: boolean;
  ts: string;
};

type ZodResponse = { schema?: string; error?: string };

function TsToZod() {
  const { push } = useNavigation();

  function convert(ts: string, keepComments: boolean, skipParseJSDoc: boolean, callback: (zod: ZodResponse) => void) {
    const filePath = path.join(tmpDir, crypto.randomBytes(16).toString("hex")) + ".ts";
    if (ts.includes("z.")) {
      console.warn("IS ZOD");
      showToast({ title: "Is already ZOD", style: Toast.Style.Failure });
      return callback({ schema: ts });
    }

    try {
      const schemaGenerator = generate({
        sourceText: ts,
        keepComments: keepComments,
        skipParseJSDoc: skipParseJSDoc,
      });

      const schema = schemaGenerator.getZodSchemasFile(filePath);

      const formattedSchema = schema.split(/\r?\n/).slice(1).join("\n");
      callback({ schema: formattedSchema.split("\n").slice(2).join("\n"), error: schemaGenerator.errors[0] });
      if (schemaGenerator.errors.length) console.error(JSON.stringify(schemaGenerator.errors));
      showToast({ title: "Converted", style: Toast.Style.Success });
    } catch (e) {
      console.error(e);
      if (e instanceof Error) callback({ error: e.message });
      else callback({ error: JSON.stringify(e) });
    }
  }

  const { handleSubmit, itemProps, setValue } = useForm<TsToZodForm>({
    onSubmit({ ts, keepComments, skipParseJSDoc }) {
      convert(ts, keepComments, skipParseJSDoc, (zod) => push(<ZodSchemaView zod={zod} />));
    },
  });
  useEffect(() => {
    (async () => {
      setValue("ts", (await Clipboard.readText()) ?? "");
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert TS type to Zod schema" />
      <Form.Checkbox label="Keep comments" {...itemProps.keepComments} />
      <Form.Checkbox label="Skip Parse JSDoc" {...itemProps.skipParseJSDoc} />
      <Form.TextArea autoFocus enableMarkdown {...itemProps.ts} />
    </Form>
  );
}

function ZodSchemaView({ zod }: { zod: ZodResponse }) {
  const language = zod.error ? "json" : "TypeScript";
  const code = zod.schema ?? zod.error;
  const markdown = `\`\`\`${language}\n${code}\n\`\`\``;
  return (
    <Detail
      actions={<ActionPanel>{zod.schema && <Action.CopyToClipboard content={zod.schema} />}</ActionPanel>}
      markdown={markdown}
    />
  );
}

TsToZod.displayName = "TS to Zod";
TsToZod.description = "Converts a TS type to a Zod schema";
TsToZod.icon = Icon.Code;

export default TsToZod;
