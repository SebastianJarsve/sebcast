import { showToast, Toast, useNavigation } from "@raycast/api";
import axios from "axios";
import { useState } from "react";
import z from "zod";
import { saveVariableToActiveEnvironment } from "~/store/environments";
import { requestSchema, type Collection, type Request } from "~/types";
import { getValueByPath, runRequest } from "~/utils";
import { ErrorDetail } from "~/views/error-view";
import { ResponseView } from "~/views/response";

export function useRunRequest() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (request: Request, collection: Collection) => {
    // Validate before running request
    const validationResult = requestSchema.safeParse(request);
    if (!validationResult.success) {
      push(<ErrorDetail error={validationResult.error} />);
      return;
    }
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running request..." });
    try {
      if (!collection) return;

      // ✨ Temporary variable context for this request chain
      const temporaryVariables: Record<string, string> = {};

      // Run pre-request actions first
      if (request.preRequestActions && request.preRequestActions.length > 0) {
        const enabledPreRequests = request.preRequestActions.filter((a) => a.enabled);

        for (const preRequestAction of enabledPreRequests) {
          const preRequest = collection.requests.find((r) => r.id === preRequestAction.requestId);

          if (preRequest) {
            console.log(`Running pre-request: ${preRequest.title || preRequest.url}`);
            toast.message = `Running pre-request: ${preRequest.title || preRequest.url}`;

            // Run the pre-request with current temporary variables
            const response = await runRequest(preRequest, collection, temporaryVariables);

            // Extract variables from pre-request response
            if (preRequest.responseActions) {
              for (const action of preRequest.responseActions) {
                let extractedValue: unknown;

                if (action.source === "BODY_JSON") {
                  extractedValue = getValueByPath(response.data, action.sourcePath);
                } else if (action.source === "HEADER") {
                  extractedValue = response.headers[action.sourcePath.toLowerCase()];
                }

                if (typeof extractedValue === "string" || typeof extractedValue === "number") {
                  const valueStr = String(extractedValue);

                  // ✨ Store based on storage preference
                  if (action.storage === "ENVIRONMENT") {
                    // Save to environment (persistent)
                    saveVariableToActiveEnvironment(action.variableKey, valueStr);
                  } else {
                    // Store temporarily (only for this request chain)
                    temporaryVariables[action.variableKey] = valueStr;
                  }
                }
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
      const response = await runRequest(request, collection);

      toast.hide();
      if (!response) throw response;
      push(
        <ResponseView
          sourceRequestId={request.id}
          requestSnapshot={request}
          response={{
            requestMethod: request.method,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>,
            body: response.data,
          }}
        />,
      );
    } catch (error) {
      // Check if it's an Axios error with a response from the server
      if (axios.isAxiosError(error) && error.response) {
        // This is an API error (e.g., 404, 500). Show the detailed view.
        toast.hide();
        push(
          <ResponseView
            requestSnapshot={request}
            response={{
              requestMethod: request.method,
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers as Record<string, string>,
              body: error.response.data,
            }}
          />,
        );
      } else if (error instanceof z.ZodError) {
        toast.hide();
        // This is a validation error from our schema -> Show the ErrorDetail view
        push(<ErrorDetail error={error} />);
      } else if (axios.isAxiosError(error) && error.code === "ENOTFOUND") {
        // This is a DNS/network error, which often means a VPN isn't connected.
        toast.style = Toast.Style.Failure;
        toast.title = "Host Not Found";
        toast.message = "Check your internet or VPN connection.";
      } else {
        // This is a network error (e.g., connection refused) or another issue.
        // For these, a toast is appropriate.
        toast.style = Toast.Style.Failure;
        toast.title = "Request Failed";
        toast.message = String(error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return { execute, isLoading };
}
