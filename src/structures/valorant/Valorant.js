const { Agent } = require("https");
const axios = require("axios").default;
const { getUser, saveUser, deleteUser } = require("../database/Database");

const RIOT_AUTH_URL =
  "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid&prompt=login";

const ciphers = [
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_128_GCM_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES128-SHA256",
  "ECDHE-RSA-AES128-SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-AES128-SHA",
  "ECDHE-RSA-AES128-SHA",
  "ECDHE-ECDSA-AES256-SHA",
  "ECDHE-RSA-AES256-SHA",
  "RSA-PSK-AES128-GCM-SHA256",
  "RSA-PSK-AES256-GCM-SHA384",
  "RSA-PSK-AES128-CBC-SHA",
  "RSA-PSK-AES256-CBC-SHA",
];

const tlsSigAlgs = [
  "ecdsa_secp256r1_sha256",
  "rsa_pss_rsae_sha256",
  "rsa_pkcs1_sha256",
  "ecdsa_secp384r1_sha384",
  "rsa_pss_rsae_sha384",
  "rsa_pkcs1_sha384",
  "rsa_pss_rsae_sha512",
  "rsa_pkcs1_sha512",
  "rsa_pkcs1_sha1",
];

const agent = new Agent({
  ciphers: ciphers.join(":"),
  sigalgs: tlsSigAlgs.join(":"),
  honorCipherOrder: true,
  minVersion: "TLSv1.3",
});

class ValorantAPIError extends Error {
  data;

  constructor(message, data) {
    super(message);
    this.data = data;
  }
}

const parseUrl = (uri) => {
  if (!uri || !uri.includes("access_token=")) {
    throw new ValorantAPIError(
      "Invalid Redirect URL! Please make sure the URL contains `#access_token=...` from the Riot redirect page."
    );
  }

  const fragment = uri.includes("#") ? uri.split("#")[1] : uri;
  const params = new URLSearchParams(fragment);

  const accessToken = params.get("access_token")?.trim();
  const idToken = params.get("id_token")?.trim();
  const expiresIn = params.get("expires_in")?.trim();

  if (!accessToken) {
    throw new ValorantAPIError("Failed to extract `access_token` from the provided URL.");
  }

  return { accessToken, idToken, expiresIn };
};

const makeHeaders = (accessToken, entitlementsToken, clientVersion) => {
  const clientPlatform = {
    platformType: "PC",
    platformOS: "Windows",
    platformOSVersion: "10.0.19042.1.256.64bit",
    platformChipset: "Unknown",
  };

  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Riot-Entitlements-JWT": entitlementsToken,
    "X-Riot-ClientVersion": clientVersion,
    "X-Riot-ClientPlatform": Buffer.from(JSON.stringify(clientPlatform)).toString("base64"),
  };
};

const fetchTokensFromCookie = async (rawCookie) => {
  const cookieHeader = rawCookie.includes("ssid=") ? rawCookie.trim() : `ssid=${rawCookie.trim()}`;

  const res = await axios({
    url: RIOT_AUTH_URL,
    method: "GET",
    headers: {
      Cookie: cookieHeader,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
    httpsAgent: agent,
  }).catch(() => null);

  if (res && res.headers && res.headers.location && res.headers.location.includes("access_token=")) {
    const newSsid = res.headers["set-cookie"]?.find((c) => /^ssid=/.test(c))?.split(";")[0];
    return {
      tokens: parseUrl(res.headers.location),
      ssidCookie: newSsid || cookieHeader,
    };
  }

  const postRes = await axios({
    url: "https://auth.riotgames.com/api/v1/authorization",
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      "User-Agent": "RiotClient/91.0.2.1870.3774 rso-auth (Windows;10;;Professional, x64)",
    },
    data: {
      client_id: "play-valorant-web-prod",
      nonce: "1",
      redirect_uri: "https://playvalorant.com/opt_in",
      response_type: "token id_token",
      scope: "account openid",
    },
    httpsAgent: agent,
  }).catch((err) => {
    throw new ValorantAPIError(
      "Failed to authenticate using your `ssid` cookie. The cookie may be expired or blocked by Cloudflare — please use the Redirect URL instead!",
      err.response?.data
    );
  });

  const uri = postRes.data?.response?.parameters?.uri;
  if (!uri) {
    throw new ValorantAPIError(
      "Your `ssid` cookie is expired or invalid. Please log in using the Redirect URL!"
    );
  }

  const newSsid = postRes.headers["set-cookie"]?.find((c) => /^ssid=/.test(c))?.split(";")[0];
  return {
    tokens: parseUrl(uri),
    ssidCookie: newSsid || cookieHeader,
  };
};

const fetchEntitlements = (accessToken) => {
  return axios({
    url: "https://entitlements.auth.riotgames.com/api/token/v1",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "RiotClient/91.0.2.1870.3774 rso-auth (Windows;10;;Professional, x64)",
    },
    data: {},
    httpsAgent: agent,
  });
};

const fetchPas = (accessToken, idToken) => {
  return axios({
    url: "https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant",
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "RiotClient/91.0.2.1870.3774 rso-auth (Windows;10;;Professional, x64)",
    },
    data: {
      id_token: idToken,
    },
    httpsAgent: agent,
  });
};

const fetchValorantVersion = () => {
  return axios({
    url: "https://valorant-api.com/v1/version",
    method: "GET",
  });
};

const getIngameUsername = async (accessToken, region, puuid, headers) => {
  try {
    const res = await axios({
      url: "https://auth.riotgames.com/userinfo",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.data?.acct?.game_name && res.data?.acct?.tag_line) {
      return `${res.data.acct.game_name}#${res.data.acct.tag_line}`;
    }
  } catch (_) {}

  try {
    const nameRes = await axios({
      url: `https://pd.${region}.a.pvp.net/name-service/v2/players`,
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      data: [puuid],
    });
    if (Array.isArray(nameRes.data) && nameRes.data[0]?.GameName) {
      return `${nameRes.data[0].GameName}#${nameRes.data[0].TagLine}`;
    }
  } catch (_) {}

  return "Valorant Player";
};

/**
 * Authenticate a user using either a Riot Redirect URL (containing #access_token=...)
 * or an `ssid` cookie string, and persist to SQLite.
 *
 * @param {string} id - Discord user ID
 * @param {string} input - Redirect URL or ssid cookie string
 * @return {Promise<object>} User data with headers, puuid, region, and username
 */
const loginWithUrlOrCookie = async (id, input) => {
  const existingUser = getUser(id) || {};
  let tokens;
  let ssidCookie = existingUser.ssidCookie || null;

  const trimmed = input.trim();
  if (trimmed.includes("access_token=")) {
    tokens = parseUrl(trimmed);
  } else if (trimmed.startsWith("eyJ") || trimmed.startsWith("ssid=eyJ")) {
    const cookieResult = await fetchTokensFromCookie(trimmed);
    tokens = cookieResult.tokens;
    ssidCookie = cookieResult.ssidCookie;
  } else {
    throw new ValorantAPIError(
      "Invalid Redirect URL! Please copy the full URL from your browser's address bar after signing in (it must contain `#access_token=...`)."
    );
  }

  const entitlementsResponse = await fetchEntitlements(tokens.accessToken).catch((err) => {
    throw new ValorantAPIError(
      "Failed to fetch Entitlements Token from Riot. Please make sure your Redirect URL or token hasn't expired!",
      err.response?.data
    );
  });
  tokens.entitlementsToken = entitlementsResponse.data.entitlements_token;

  const tokenPayload = JSON.parse(
    Buffer.from(tokens.accessToken.split(".")[1], "base64").toString()
  );
  const puuid = tokenPayload.sub;

  let region = "ap";
  if (tokens.idToken) {
    try {
      const pasTokenResponse = await fetchPas(tokens.accessToken, tokens.idToken);
      region = pasTokenResponse.data?.affinities?.live || "ap";
    } catch (_) {
      region = existingUser.region || "ap";
    }
  } else if (existingUser.region) {
    region = existingUser.region;
  }

  const versionResponse = await fetchValorantVersion();
  const clientVersion = versionResponse.data.data.riotClientVersion;

  const headers = makeHeaders(tokens.accessToken, tokens.entitlementsToken, clientVersion);
  const username = await getIngameUsername(tokens.accessToken, region, puuid, headers);

  saveUser(id, {
    headers,
    puuid,
    region,
    username,
    ssidCookie,
  });

  return {
    ...headers,
    puuid,
    region,
    username,
  };
};

/**
 * Attempts to refresh a user's session if they have an ssidCookie saved.
 */
const reauthorizeUser = async (id) => {
  const user = getUser(id);
  if (!user || !user.ssidCookie) return null;

  try {
    await loginWithUrlOrCookie(id, user.ssidCookie);
    return getUser(id);
  } catch (_) {
    return null;
  }
};

const getValorantUser = loginWithUrlOrCookie;

module.exports = {
  RIOT_AUTH_URL,
  ValorantAPIError,
  loginWithUrlOrCookie,
  reauthorizeUser,
  getValorantUser,
  getUser,
  saveUser,
  deleteUser,
  makeHeaders,
};
