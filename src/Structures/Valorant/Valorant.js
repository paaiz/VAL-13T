const { Agent } = require('https');
const axios = require('axios').default;

const ciphers = [
	'TLS_CHACHA20_POLY1305_SHA256',
	'TLS_AES_128_GCM_SHA256',
	'TLS_AES_256_GCM_SHA384',
	'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
];
// * Agent with custom cipher suites
const agent = new Agent({
	ciphers: ciphers.join(':'),
	honorCipherOrder: true,
	minVersion: 'TLSv1.2',
});

// * Valorant Authentication
let tokens = new Object();
let headers = new Object();

let ssidCookie = new String();
let clientVersion = new String();
let region = new String();
let asidCookie = new String();

class ValorantAPIError extends Error {
	data;

	constructor(message, data) {
		super(message);
		this.data = data;
	}
}

const input2faCode = (login) => {
	return `Riot sent your 2FA code to **${login.multifactor.email}**. Use \`/2fa\` to complete your login!`;
};

const parseUrl = (uri) => {
	const loginResponseURI = new URL(uri);
	const accessToken = loginResponseURI.searchParams.get('access_token');
	const idToken = loginResponseURI.searchParams.get('id_token');
	const expiresIn = parseInt(loginResponseURI.searchParams.get('expires_in'));

	return { accessToken, idToken, expiresIn };
};

const makeHeaders = () => {
	const clientPlatform = {
		platformType: 'PC',
		platformOS: 'Windows',
		platformOSVersion: '10.0.19043.1.256.64bit',
		platformChipset: 'Unknown',
	};

	headers = {
		Authorization: `Bearer ${tokens.accessToken}`,
		'X-Riot-Entitlements-JWT': tokens.entitlementsToken,
		'X-Riot-ClientVersion': clientVersion,
		'X-Riot-ClientPlatform': Buffer.from(JSON.stringify(clientPlatform)).toString('base64'),
	};
};

const createSession = (ssidCookie) => {
	return axios({
		url: 'https://auth.riotgames.com/api/v1/authorization',
		method: 'POST',
		headers: {
			...(typeof ssidCookie === 'undefined' ? '' : { Cookie: ssidCookie }),
			'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)',
		},
		data: {
			client_id: 'play-valorant-web-prod',
			nonce: 1,
			redirect_uri: 'https://playvalorant.com/opt_in',
			response_type: 'token id_token',
			response_mode: 'query',
			scope: 'account openid',
		},
		httpsAgent: agent,
	});
};

const login = (cookie, username, password) => {
	return axios({
		url: 'https://auth.riotgames.com/api/v1/authorization',
		method: 'PUT',
		headers: {
			Cookie: cookie,
			'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)',
		},
		data: {
			type: 'auth',
			username,
			password,
		},
		httpsAgent: agent,
	});
};

const send2faCode = (code, cookie = asidCookie) => {
	return axios({
		url: 'https://auth.riotgames.com/api/v1/authorization',
		method: 'PUT',
		headers: {
			Cookie: cookie,
			'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows; 10;;Professional, x64)',
		},
		data: {
			type: 'multifactor',
			code,
			rememberDevice: true,
		},
		httpsAgent: agent,
	});
};

const fetchEntitlements = (accessToken) => {
	return axios({
		url: 'https://entitlements.auth.riotgames.com/api/token/v1',
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
		data: {},
	});
};

const fetchPas = (accessToken, idToken) => {
	return axios({
		url: 'https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant',
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
		data: {
			id_token: idToken,
		},
	});
};

const fetchValorantVersion = () => {
	return axios({
		url: 'https://valorant-api.com/v1/version',
		method: 'GET',
	});
};

const getIngameUsername = (accessToken) => {
	return axios({
		url: 'https://auth.riotgames.com/userinfo',
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
};

// const setupReauth = () => {
// 	setInterval(async () => {
// 		try {
// 			const response = await createSession(ssidCookie);

// 			ssidCookie = response.headers['set-cookie'].find((elem) => /^ssid/.test(elem));

// 			tokens = { ...tokens, ...parseUrl(response.data.response.parameters.uri) };

// 			makeHeaders();
// 		} catch (err) {
// 			console.trace(err);
// 		}
// 	}, (tokens.expiresIn - 300) * 1000);
// };

const getValorant2faUser = async (id, code, cookie = asidCookie) => {
	const user = getUser(id) || {};

	const response = await send2faCode(code, cookie).catch((err) => {
		if (typeof err.response.data === 'undefined') throw new ValorantAPIError('Unknown error!', err.response);
		if (err.response.data.error === 'rate_limited') throw new ValorantAPIError('Too many 2FA requests!');
		if (err.response.data.error === 'invalid_session_id') throw new ValorantAPIError("Invalid session id! Try `/login` if you haven't login.");
		throw new ValorantAPIError('Unknown error!', err.response.data);
	});

	if (typeof response.data.error !== 'undefined') {
		if (response.data.error === 'multifactor_attempt_failed') throw new ValorantAPIError('Invalid 2FA Code!');
		if (response.data.error === 'rate_limited') throw new ValorantAPIError('Too many 2FA requests!');
		throw new ValorantAPIError('Unknown error!', response.data);
	}

	ssidCookie = response.headers['set-cookie'].find((cookie) => /^ssid/.test(cookie));

	tokens = parseUrl(response.data.response.parameters.uri);

	tokens.entitlementsToken = (await fetchEntitlements(tokens.accessToken)).data.entitlements_token;

	const puuid = JSON.parse(Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString()).sub;

	const pasTokenResponse = await fetchPas(tokens.accessToken, tokens.idToken);

	tokens.pasToken = pasTokenResponse.data.token;
	region = pasTokenResponse.data.affinities.live;

	clientVersion = (await fetchValorantVersion()).data.data.riotClientVersion;

	const getGameUsername = await getIngameUsername(tokens.accessToken);

	makeHeaders();
	// setupReauth();

	users[id] = user;

	user.headers = { ...headers };
	user.puuid = puuid;
	user.region = region;
	user.username = `${getGameUsername.data.acct.game_name}#${getGameUsername.data.acct.tag_line}`;
	user.is2FA = true;

	saveUserData();

	return {
		...headers,
		puuid,
		region: region,
		username: `${getGameUsername.data.acct.game_name}#${getGameUsername.data.acct.tag_line}`,
	};
};

const getValorantUser = async (id, username, password) => {
	try {
		const user = getUser(id) || {};

		const session = await createSession();
		asidCookie = session.headers['set-cookie'].find((cookie) => /^asid/.test(cookie));

		const loginResponse = await login(asidCookie, username, password).catch((err) => {
			if (typeof err.response.data === 'undefined') throw new ValorantAPIError('Unkown error!', err.response);
			if (err.response.data.error === 'rate_limited') throw new ValorantAPIError('Too many login attempts. Please try again in a few minutes!');
			throw new ValorantAPIError('Unknown error!', err.response.data);
		});

		// * Authentication failed (Incorrect login info)
		if (typeof loginResponse.data.error !== 'undefined') {
			console.dir(loginResponse.data);
			if (loginResponse.data.error === 'auth_failure') throw new ValorantAPIError('Your username or password is wrong. Please check again');
			if (loginResponse.data.error === 'rate_limited') throw new ValorantAPIError('Too many requests. Try again in a few minutes!');
			throw new ValorantAPIError('Unknown error!', loginResponse.data);
		}

		asidCookie = loginResponse.headers['set-cookie'].find((cookie) => /^asid/.test(cookie));

		users[id] = user;

		let response;

		// * Check if 2FA is enabled, else ask the user to run 2fa slash command.
		if (loginResponse.data.type === 'response') {
			response = loginResponse;
		} else if (loginResponse.data.type === 'multifactor') {
			return input2faCode(loginResponse.data);
		}

		ssidCookie = response.headers['set-cookie'].find((cookie) => /^ssid/.test(cookie));

		tokens = parseUrl(response.data.response.parameters.uri);

		tokens.entitlementsToken = (await fetchEntitlements(tokens.accessToken)).data.entitlements_token;

		const puuid = JSON.parse(Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString()).sub;

		const pasTokenResponse = await fetchPas(tokens.accessToken, tokens.idToken);

		tokens.pasToken = pasTokenResponse.data.token;
		region = pasTokenResponse.data.affinities.live;

		clientVersion = (await fetchValorantVersion()).data.data.riotClientVersion;

		const getGameUsername = await getIngameUsername(tokens.accessToken);

		makeHeaders();
		// setupReauth();

		user.headers = { ...headers };
		user.puuid = puuid;
		user.region = region;
		user.username = `${getGameUsername.data.acct.game_name}#${getGameUsername.data.acct.tag_line}`;

		saveUserData();

		return {
			...headers,
			puuid,
			region: region,
			username: `${getGameUsername.data.acct.game_name}#${getGameUsername.data.acct.tag_line}`,
		};
	} catch (err) {
		throw err;
	}
};

// * Database to store user's headers, puuid, region, username.
const fs = require('fs');
const path = require('path');

let users;

const loadUserData = () => {
	if (!users)
		try {
			users = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../Valorant/Assets/Data/users.json'), 'utf-8'));
			saveUserData();
		} catch (err) {
			users = {};
		}
};

const saveUserData = () => {
	fs.writeFileSync(path.resolve(__dirname, '../Valorant/Assets/Data/users.json'), JSON.stringify(users, null, 4));
};

const getUser = (id) => {
	loadUserData();
	return users[id];
};

const deleteUser = (id) => {
	delete users[id];
	saveUserData();
};
// * ---------------------

module.exports = { getValorantUser, getValorant2faUser, getUser, deleteUser, loadUserData };
