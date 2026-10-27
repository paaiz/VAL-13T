const { Agent } = require("https");
const { randomUUID } = require("node:crypto");
const axios = require("axios").default;
const {
  MAX_ACCOUNTS_PER_USER,
  getUser,
  getAccountByPuuid,
  getUserAccounts,
  saveUser,
  updateAccountSession,
  setActiveAccount,
  deleteUser,
} = require("../database/Database");

const AUTH_REQUEST_TIMEOUT_MS = 10000;
const REFRESH_BUFFER_SEC = 300; // Refresh tokens 5 minutes before expiry (Ministral standard)

/**
 * Generates a Riot OAuth2 Authorization Code URL with `offline_access` scope
 * so the bot receives a long-lived `refresh_token` directly from Riot without cookies.
 */
const generateWebAuthUrl = (promptLogin = false) => {
  const params = new URLSearchParams({
    client_id: "riot-client",
    redirect_uri: "http://localhost/redirect",
    response_type: "code",
    scope: "openid link ban lol_region account offline_access",
    nonce: randomUUID(),
  });
  if (promptLogin) {
    params.set("prompt", "login");
  }
  return `https://auth.riotgames.com/authorize?${params.toString()}`;
};

const RIOT_AUTH_URL = generateWebAuthUrl(false);
const RIOT_SWITCH_AUTH_URL = generateWebAuthUrl(true);

const RIOT_COOKIE_REAUTH_URL =
  "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid";

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
  keepAlive: true,
  maxSockets: 10,
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

let cachedVersionData = null;
let cachedVersionFetchedAt = 0;
const VERSION_CACHE_TTL_MS = 15 * 60 * 1000;

const getRiotVersionData = async () => {
  if (cachedVersionData && Date.now() - cachedVersionFetchedAt < VERSION_CACHE_TTL_MS) {
    return cachedVersionData;
  }
  try {
    const res = await axios.get("https://valorant-api.com/v1/version", {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
    if (res.data?.data) {
      cachedVersionData = res.data.data;
      cachedVersionFetchedAt = Date.now();
      return cachedVersionData;
    }
  } catch (_) {}
  return cachedVersionData;
};

const getUserAgent = async () => {
  const versionData = await getRiotVersionData();
  const version = versionData
    ? versionData.riotClientBuild || versionData.riotClientVersion
    : "release-10.00-shipping-0-0000000";
  return `RiotClient/${version} rso-auth (Windows;10;;Professional, x64)`;
};

const decodeToken = (token) => {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : null;
  } catch (_) {
    try {
      return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    } catch (__) {
      return null;
    }
  }
};

const extractCodeFromUri = (uri) => {
  try {
    const url = new URL(uri);
    return url.searchParams.get("code")?.trim() || null;
  } catch (_) {
    const match = uri.match(/[?&]code=([^&#\s]+)/);
    return match ? decodeURIComponent(match[1].trim()) : null;
  }
};

const exchangeCodeForTokens = async (code) => {
  const userAgent = await getUserAgent();
  const res = await axios({
    url: "https://auth.riotgames.com/token",
    method: "POST",
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
      Cookie: "dummy=cookie",
      "Accept-Language": "en-US,en;q=0.5",
    },
    data: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost/redirect",
      client_id: "riot-client",
    }).toString(),
    httpsAgent: agent,
  }).catch((err) => {
    throw new ValorantAPIError(
      "Failed to exchange authorization code for tokens. The code may have expired (codes are single-use) — please click the login link and copy a fresh URL!",
      err.response?.data,
    );
  });

  if (!res.data?.access_token) {
    throw new ValorantAPIError(
      "Riot did not return an access token for this authorization code. Please try logging in again!",
    );
  }

  return {
    accessToken: res.data.access_token,
    idToken: res.data.id_token || null,
    refreshToken: res.data.refresh_token || null,
  };
};

const refreshWithRefreshToken = async (refreshToken) => {
  try {
    const userAgent = await getUserAgent();
    const res = await axios({
      url: "https://auth.riotgames.com/token",
      method: "POST",
      timeout: AUTH_REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        Cookie: "dummy=cookie",
        "Accept-Language": "en-US,en;q=0.5",
      },
      data: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "riot-client",
      }).toString(),
      httpsAgent: agent,
    });

    if (!res.data?.access_token) {
      return { success: false, networkError: true };
    }

    return {
      success: true,
      tokenData: {
        accessToken: res.data.access_token,
        idToken: res.data.id_token || null,
        refreshToken: res.data.refresh_token || refreshToken,
      },
    };
  } catch (err) {
    const status = err.response?.status;
    const errorCode = err.response?.data?.error;
    const invalidToken =
      (status === 400 || status === 401) && ["invalid_grant", "bad_claims"].includes(errorCode);
    return {
      success: false,
      invalidToken,
      errorCode,
      statusCode: status,
    };
  }
};

const parseUrl = (uri) => {
  if (!uri || !uri.includes("access_token=")) {
    throw new ValorantAPIError(
      "Invalid Redirect URL! Please make sure the URL contains `?code=...` or `#access_token=...` from the Riot redirect page.",
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

  return { accessToken, idToken, expiresIn, refreshToken: null };
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
  const userAgent = await getUserAgent();

  const res = await axios({
    url: RIOT_COOKIE_REAUTH_URL,
    method: "GET",
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: {
      Cookie: cookieHeader,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
    httpsAgent: agent,
  }).catch(() => null);

  if (
    res &&
    res.headers &&
    res.headers.location &&
    res.headers.location.includes("access_token=")
  ) {
    const newSsid = res.headers["set-cookie"]?.find((c) => /^ssid=/.test(c))?.split(";")[0];
    return {
      tokens: parseUrl(res.headers.location),
      ssidCookie: newSsid || cookieHeader,
    };
  }

  const postRes = await axios({
    url: "https://auth.riotgames.com/api/v1/authorization",
    method: "POST",
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      "User-Agent": userAgent,
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
      err.response?.data,
    );
  });

  const uri = postRes.data?.response?.parameters?.uri;
  if (!uri) {
    throw new ValorantAPIError(
      "Your `ssid` cookie is expired or invalid. Please log in using the Redirect URL!",
    );
  }

  const newSsid = postRes.headers["set-cookie"]?.find((c) => /^ssid=/.test(c))?.split(";")[0];
  return {
    tokens: parseUrl(uri),
    ssidCookie: newSsid || cookieHeader,
  };
};

const fetchEntitlements = async (accessToken) => {
  const userAgent = await getUserAgent();
  return axios({
    url: "https://entitlements.auth.riotgames.com/api/token/v1",
    method: "POST",
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      Cookie: "dummy=cookie",
    },
    data: {},
    httpsAgent: agent,
  });
};

const fetchPas = async (accessToken, idToken) => {
  const userAgent = await getUserAgent();
  return axios({
    url: "https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant",
    method: "PUT",
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      Cookie: "dummy=cookie",
    },
    data: {
      id_token: idToken,
    },
    httpsAgent: agent,
  });
};

const getIngameUsername = async (accessToken, region, puuid, headers) => {
  try {
    const res = await axios({
      url: "https://auth.riotgames.com/userinfo",
      method: "GET",
      timeout: AUTH_REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: "dummy=cookie",
      },
      httpsAgent: agent,
    });
    if (res.data?.acct?.game_name && res.data?.acct?.tag_line) {
      return `${res.data.acct.game_name}#${res.data.acct.tag_line}`;
    }
  } catch (_) {}

  try {
    const nameRes = await axios({
      url: `https://pd.${region}.a.pvp.net/name-service/v2/players`,
      method: "PUT",
      timeout: AUTH_REQUEST_TIMEOUT_MS,
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
 * Authenticate a user using:
 * 1) Riot OAuth2 Code Redirect URL (`http://localhost/redirect?code=...`) -> gets long-lived `refresh_token`!
 * 2) Legacy Riot Implicit Redirect URL (`https://playvalorant.com/opt_in#access_token=...`)
 * 3) Raw `ssid` cookie string
 *
 * @param {string} id - Discord user ID
 * @param {string} input - Redirect URL or ssid cookie string
 * @return {Promise<object>} User data with headers, puuid, region, and username
 */
const loginWithUrlOrCookie = async (id, input) => {
  const existingAccounts = getUserAccounts(id);
  let tokens;
  let newSsidCookie = null;

  const trimmed = input.trim();
  const code = extractCodeFromUri(trimmed);

  if (code) {
    tokens = await exchangeCodeForTokens(code);
  } else if (trimmed.includes("access_token=")) {
    tokens = parseUrl(trimmed);
  } else if (trimmed.startsWith("eyJ") || trimmed.startsWith("ssid=eyJ")) {
    const cookieResult = await fetchTokensFromCookie(trimmed);
    tokens = cookieResult.tokens;
    newSsidCookie = cookieResult.ssidCookie;
  } else {
    throw new ValorantAPIError(
      "Invalid Redirect URL! Make sure you copied the full URL from your browser's address bar (`http://localhost/redirect?code=...`).",
    );
  }

  const tokenPayload = decodeToken(tokens.accessToken);
  const puuid = tokenPayload?.sub;
  if (!puuid) {
    throw new ValorantAPIError("Could not decode PUUID from Riot access token.");
  }

  const existingAccount = existingAccounts.find((acc) => acc.puuid === puuid);
  if (!existingAccount && existingAccounts.length >= MAX_ACCOUNTS_PER_USER) {
    throw new ValorantAPIError(
      `You have reached the maximum limit of **${MAX_ACCOUNTS_PER_USER} linked accounts**! Please run \`/logout\` to remove an account first.`,
    );
  }

  const ssidCookie = newSsidCookie || existingAccount?.ssidCookie || null;
  const refreshToken = tokens.refreshToken || existingAccount?.refreshToken || null;

  const versionData = await getRiotVersionData();
  const clientVersion = versionData?.riotClientVersion || "release-10.00-shipping-0-0000000";

  const [entitlementsResponse, pasResult] = await Promise.all([
    fetchEntitlements(tokens.accessToken).catch((err) => {
      throw new ValorantAPIError(
        "Failed to fetch Entitlements Token from Riot. Please try clicking **Switch / Relogin Account** and pasting a fresh URL!",
        err.response?.data,
      );
    }),
    tokens.idToken
      ? fetchPas(tokens.accessToken, tokens.idToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const entitlementsToken = entitlementsResponse.data.entitlements_token;
  const region = pasResult?.data?.affinities?.live || existingAccount?.region || "ap";

  const headers = makeHeaders(tokens.accessToken, entitlementsToken, clientVersion);
  const username = await getIngameUsername(tokens.accessToken, region, puuid, headers);

  saveUser(id, {
    headers,
    puuid,
    region,
    username,
    ssidCookie,
    refreshToken,
  });

  return {
    ...headers,
    puuid,
    region,
    username,
  };
};

/**
 * Checks whether an account's stored JWT access token is still valid or needs refresh.
 */
const checkAccountStatus = (account) => {
  const hasRefreshToken = Boolean(account?.refreshToken);
  const hasCookie = Boolean(account?.ssidCookie);
  const canAutoRefresh = hasRefreshToken || hasCookie;

  try {
    const authHeader = account?.headers?.Authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const hasEntitlements = Boolean(account?.headers?.["X-Riot-Entitlements-JWT"]);
    if (!token) {
      return {
        valid: false,
        needsProactiveRefresh: true,
        expiresAt: null,
        hasRefreshToken,
        hasCookie,
        canAutoRefresh,
      };
    }
    const payload = decodeToken(token);
    const exp = payload?.exp || 0;
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      valid: hasEntitlements && exp > nowSec + 30,
      needsProactiveRefresh: !hasEntitlements || exp <= nowSec + REFRESH_BUFFER_SEC,
      expiresAt: exp,
      hasRefreshToken,
      hasCookie,
      canAutoRefresh,
    };
  } catch (_) {
    return {
      valid: false,
      needsProactiveRefresh: true,
      expiresAt: null,
      hasRefreshToken,
      hasCookie,
      canAutoRefresh,
    };
  }
};

// In-flight refresh deduplication map (prevents concurrent commands from racing refresh_token rotation)
const activeRefreshes = new Map();

/**
 * Refreshes a user's active account session using `refresh_token` (or fallback `ssidCookie`).
 * Follows Ministral's atomic refresh pattern:
 * 1. Deduplicates concurrent refresh calls per `${userId}:${puuid}`
 * 2. Saves rotated `refresh_token` + `access_token` to SQLite BEFORE requesting entitlements
 * 3. Fetches entitlements & updates headers in SQLite
 */
const reauthorizeUser = async (id, { force = false, puuid = null } = {}) => {
  const initialUser = puuid ? getAccountByPuuid(id, puuid) : getUser(id);
  if (!initialUser) return null;

  const status = checkAccountStatus(initialUser);
  if (!force && !status.needsProactiveRefresh) {
    return initialUser;
  }

  const lockKey = `${id}:${initialUser.puuid}`;
  if (activeRefreshes.has(lockKey)) {
    return activeRefreshes.get(lockKey);
  }

  const refreshPromise = (async () => {
    const user = getAccountByPuuid(id, initialUser.puuid) || getUser(id);
    if (!user) return null;

    const latestStatus = checkAccountStatus(user);
    if (!force && !latestStatus.needsProactiveRefresh) {
      return user;
    }

    // 1. Primary Method: OAuth2 Refresh Token (`offline_access` via `riot-client`)
    if (user.refreshToken) {
      const refreshRes = await refreshWithRefreshToken(user.refreshToken);

      if (refreshRes.success) {
        const { accessToken, refreshToken: rotatedRefreshToken } = refreshRes.tokenData;
        const versionData = await getRiotVersionData();
        const clientVersion =
          versionData?.riotClientVersion ||
          user.headers?.["X-Riot-ClientVersion"] ||
          "release-10.00-shipping-0-0000000";

        // Persist rotated refresh_token and new access_token BEFORE calling entitlements
        // so a temporary entitlements outage never loses a rotated refresh_token!
        const partialHeaders = makeHeaders(accessToken, "", clientVersion);
        delete partialHeaders["X-Riot-Entitlements-JWT"];

        updateAccountSession(id, user.puuid, {
          headers: partialHeaders,
          refreshToken: rotatedRefreshToken,
        });

        try {
          const entRes = await fetchEntitlements(accessToken);
          const entToken = entRes.data?.entitlements_token;
          if (!entToken) return null;

          const fullHeaders = makeHeaders(accessToken, entToken, clientVersion);
          return updateAccountSession(id, user.puuid, {
            headers: fullHeaders,
            refreshToken: rotatedRefreshToken,
          });
        } catch (_) {
          return null;
        }
      }

      // If Riot explicitly says the refresh token is invalid/revoked, clear it
      if (refreshRes.invalidToken) {
        updateAccountSession(id, user.puuid, {
          refreshToken: null,
        });
      }
    }

    // 2. Fallback Method: Legacy `ssid` Cookie
    if (user.ssidCookie) {
      try {
        const cookieResult = await fetchTokensFromCookie(user.ssidCookie);
        const entRes = await fetchEntitlements(cookieResult.tokens.accessToken);
        const versionData = await getRiotVersionData();
        const clientVersion =
          versionData?.riotClientVersion ||
          user.headers?.["X-Riot-ClientVersion"] ||
          "release-10.00-shipping-0-0000000";

        const fullHeaders = makeHeaders(
          cookieResult.tokens.accessToken,
          entRes.data.entitlements_token,
          clientVersion,
        );

        return updateAccountSession(id, user.puuid, {
          headers: fullHeaders,
          ssidCookie: cookieResult.ssidCookie,
        });
      } catch (_) {
        return null;
      }
    }

    return null;
  })();

  activeRefreshes.set(lockKey, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    activeRefreshes.delete(lockKey);
  }
};

const getValorantUser = loginWithUrlOrCookie;

module.exports = {
  RIOT_AUTH_URL,
  RIOT_SWITCH_AUTH_URL,
  generateWebAuthUrl,
  MAX_ACCOUNTS_PER_USER,
  ValorantAPIError,
  loginWithUrlOrCookie,
  reauthorizeUser,
  checkAccountStatus,
  getRiotVersionData,
  getValorantUser,
  getUser,
  getUserAccounts,
  saveUser,
  setActiveAccount,
  deleteUser,
  makeHeaders,
};
