const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getChannel = async (channelId, token) => {
  const response = await fetch(
    `${API_URL}/channels/${encodeURIComponent(channelId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch channel");
  }

  return data.channel;
};