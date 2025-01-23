import { Clipboard, showToast, Toast } from "@raycast/api";
import { Item } from "../types";

async function importData(setValue?: (items: Item[]) => void) {
  const data = await Clipboard.readText();
  if (data === undefined) {
    showToast({ title: "Could not load data from clipboard.", style: Toast.Style.Failure });
    return;
  }
  try {
    const importedItems = JSON.parse(data);
    if (setValue) setValue(importedItems);
    showToast({ title: "Success", message: "Imported commands", style: Toast.Style.Success });
    return importedItems;
  } catch (e) {
    showToast({ title: "Error", message: JSON.stringify(e), style: Toast.Style.Failure });
  }
}

export { importData };
