import { showToast, Toast, useNavigation } from "@raycast/api";
import axios from "axios";
import { useState } from "react";
import z from "zod";
import { requestSchema, type Collection, type Request } from "~/types";
import { runRequest } from "~/utils";
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
      // 2. Call our utility function
      if (!collection) return;
      const response = await runRequest(request, collection);

      // 3. On success, hide the toast and push the response view
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
