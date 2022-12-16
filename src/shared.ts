function createTrpcPortMessage(port: MessagePort) {
  return ["trpc-port", port] as const;
}

function isTrpcPortMessage(
  data: unknown
): data is ReturnType<typeof createTrpcPortMessage> {
  return (
    Array.isArray(data) &&
    data.length === 2 &&
    data[0] === "trpc-port" &&
    data[1] instanceof MessagePort
  );
}

const SOCKET_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export { SOCKET_STATE, createTrpcPortMessage, isTrpcPortMessage };
