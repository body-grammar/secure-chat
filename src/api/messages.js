const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getMessages = async (channel, token) => {
  const response = await fetch(
    `${API_URL}/messages/${channel}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  const data = await response.json();

  return data.messages;
};

export const sendMessage = async (
  channel,
  content,
  token,
  recipient = null,
  encryption = null,
  signature = null,
  signingKeyVersion = 1
) => {
  const response = await fetch(`${API_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      recipient,
      content,
      encryption,
      signature,
      signingKeyVersion,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Send message API error:", data);
    throw new Error(data.message || "Failed to send message");
  }

  return data.message;
};

export const getDirectMessages = async (userId, token) => {
  const response = await fetch(
    `${API_URL}/messages/dm/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.message || "Failed to fetch direct messages"
    );
  }

  const data = await response.json();

  return data.messages;
};

export const updateMessageStatus = async (messageId, status, token) => {
  const response = await fetch(
    `${API_URL}/messages/${messageId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update message status");
  }

  return data.message;
};
