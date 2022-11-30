type TRPCWorkerMessage = {
  type: "trpc-message";
  data: string;
};

function createWorkerMessage(data: string): TRPCWorkerMessage {
  return { data, type: "trpc-message" };
}

function isWorkerMessage(request: unknown): request is TRPCWorkerMessage {
  return (
    typeof request === "object" &&
    request !== null &&
    (request as TRPCWorkerMessage).type === "trpc-message" &&
    typeof (request as TRPCWorkerMessage).data === "string"
  );
}

export interface Endpoint {
  addEventListener(type: "message", listener: (ev: MessageEvent) => void): void;
  removeEventListener(
    type: "message",
    listener: (ev: MessageEvent) => void
  ): void;

  postMessage(message: any): void;
}

export { createWorkerMessage, isWorkerMessage };
