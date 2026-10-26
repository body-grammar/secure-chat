const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `GET /users/me failed (${response.status}): ${body}`
    );
  }

  let data;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!data.user?._id) {
    throw new Error("The server response does not contain a valid user.");
  }

  return data.user;
};

export const getUserByUsername = async (name, token) => {
    const response = await fetch(
        `${API_URL}/users/username/${encodeURIComponent(name)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to find user");
    }

    return data.user;
};

export const getUserById = async (userId, token) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to find user");
  }

  return data.user;
};

export const registerPublicKey = async (
  publicKey,
  signingPublicKey,
  token
) => {
  const response = await fetch(`${API_URL}/users/public-key`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      publicKey,
      signingPublicKey,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to register public key");
  }

  return data.user;
};

export const getUserPublicKey = async (userId, token) => {
  const response = await fetch(
    `${API_URL}/users/${encodeURIComponent(userId)}/public-key`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to retrieve public key");
  }

  return data;
};

export const getAllUsers = async (token) => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch users");
  }

  return data.users;
};
