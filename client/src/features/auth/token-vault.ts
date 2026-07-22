type AuthEvent =
  | { type: "token"; token: string; remote: boolean }
  | { type: "signed-out"; remote: boolean };

type AuthEventListener = (event: AuthEvent) => void;

const CHANNEL_NAME = "karino-auth";
const listeners = new Set<AuthEventListener>();
let accessToken: string | null = null;
let channel: BroadcastChannel | null = null;

const emit = (event: AuthEvent): void => {
  listeners.forEach((listener) => listener(event));
};

const getChannel = (): BroadcastChannel | null => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (message: MessageEvent<unknown>) => {
      const event = message.data;
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "token" &&
        "token" in event &&
        typeof event.token === "string"
      ) {
        accessToken = event.token;
        emit({ type: "token", token: event.token, remote: true });
      } else if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "signed-out"
      ) {
        accessToken = null;
        emit({ type: "signed-out", remote: true });
      }
    });
  }

  return channel;
};

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (
  token: string,
  options: { broadcast?: boolean } = {},
): void => {
  accessToken = token;
  emit({ type: "token", token, remote: false });
  if (options.broadcast) getChannel()?.postMessage({ type: "token", token });
};

export const clearAccessToken = (options: { broadcast?: boolean } = {}): void => {
  accessToken = null;
  emit({ type: "signed-out", remote: false });
  if (options.broadcast) getChannel()?.postMessage({ type: "signed-out" });
};

export const subscribeToAuthEvents = (listener: AuthEventListener): (() => void) => {
  listeners.add(listener);
  getChannel();
  return () => listeners.delete(listener);
};
