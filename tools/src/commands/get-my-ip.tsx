import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

import * as os from "os";
import http from "http";
import { useCallback, useEffect, useState } from "react";

type IpAddresses = {
  [key: string]: string[];
};

function GetMyIp() {
  const [ipAddresses, setIpAddresses] = useState<IpAddresses>({});
  const [publicIp, setPublicIp] = useState<string | undefined>();

  const getPublicIp = useCallback(() => {
    const options = {
      host: "api.ipify.org",
      port: 80,
      path: "/?format=json",
    };

    const req = http.request(options, (res) => {
      // Set the response encoding to utf8
      res.setEncoding("utf8");
      // When a chunk of data is received, append it to the body
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });

      // When the response completes, parse the JSON and log the IP address
      res.on("end", () => {
        const data = JSON.parse(body);
        setPublicIp(data.ip);
      });
    });

    req.on("error", () => {
      setPublicIp("None");
    });

    // Send the request
    req.end();
  }, []);

  useEffect(() => {
    const networkInterfaces = os.networkInterfaces();
    const results = Object.create(null);

    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]!) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
        if (net.family === familyV4Value && !net.internal) {
          if (!results[name]) {
            results[name] = [];
          }
          results[name].push(net.address);
        }
      }
    }

    setIpAddresses(JSON.parse(JSON.stringify(results)));
    getPublicIp();
  }, []);

  return (
    <List>
      {Object.keys(ipAddresses as object).map((key) => (
        <List.Section title={key} key={key}>
          {ipAddresses[key].map((ip) => (
            <List.Item
              key={ip}
              title={ip}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy to Clipoard"
                    content={ip}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {typeof publicIp === "string" ? (
        <List.Section title="Public IP">
          <List.Item
            title={publicIp}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipoard"
                  content={publicIp}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

GetMyIp.displayName = "Get my IP";
GetMyIp.description = "Fetches local and external IP addresses";
GetMyIp.icon = Icon.Wifi;

export default GetMyIp;
