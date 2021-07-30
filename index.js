class SteamID {
	static get Universe() {
		return {
			INVALID: 0,
			PUBLIC: 1,
			BETA: 2,
			INTERNAL: 3,
			DEV: 4
		};
	}

	static get Type() {
		return {
			INVALID: 0,
			INDIVIDUAL: 1,
			MULTISEAT: 2,
			GAMESERVER: 3,
			ANON_GAMESERVER: 4,
			PENDING: 5,
			CONTENT_SERVER: 6,
			CLAN: 7,
			CHAT: 8,
			P2P_SUPER_SEEDER: 9,
			ANON_USER: 10
		};
	}

	static get Instance() {
		return {
			ALL: 0,
			DESKTOP: 1,
			CONSOLE: 2,
			WEB: 4
		};
	}

	static get TypeChars() {
		return {
			[SteamID.Type.INVALID]: 'I',
			[SteamID.Type.INDIVIDUAL]: 'U',
			[SteamID.Type.MULTISEAT]: 'M',
			[SteamID.Type.GAMESERVER]: 'G',
			[SteamID.Type.ANON_GAMESERVER]: 'A',
			[SteamID.Type.PENDING]: 'P',
			[SteamID.Type.CONTENT_SERVER]: 'C',
			[SteamID.Type.CLAN]: 'g',
			[SteamID.Type.CHAT]: 'T',
			[SteamID.Type.ANON_USER]: 'a'
		};
	}

	static get AccountIDMask() { return 0xFFFFFFFF; }
	static get AccountInstanceMask() { return 0x000FFFFF; }

	static get ChatInstanceFlags() {
		return {
			Clan: (SteamID.AccountInstanceMask + 1) >> 1,
			Lobby: (SteamID.AccountInstanceMask + 1) >> 2,
			MMSLobby: (SteamID.AccountInstanceMask + 1) >> 3
		};
	}

	constructor(input) {
		this.universe = SteamID.Universe.INVALID;
		this.type = SteamID.Type.INVALID;
		this.instance = SteamID.Instance.ALL;
		this.accountid = 0;

		if (!input) {
			// Use the default invalid values
			return;
		}

		let matches;
		if (typeof input == 'bigint' || (typeof input == 'string' && input.match(/^\d+$/))) {
			// 64-bit ID
			let num = BigInt(input);
			this.accountid = Number(num & BigInt(SteamID.AccountIDMask));
			this.instance = Number((num >> 32n) & BigInt(SteamID.AccountInstanceMask));
			this.type = Number((num >> 52n) & 0xFn);
			this.universe = Number(num >> 56n);
		} else if ((matches = input.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/))) {
			// Steam2 ID
			let [_, universe, mod, accountid] = matches;

			this.universe = parseInt(universe, 10) || SteamID.Universe.PUBLIC; // If it's 0, turn it into 1 for public
			this.type = SteamID.Type.INDIVIDUAL;
			this.instance = SteamID.Instance.DESKTOP;
			this.accountid = (parseInt(accountid, 10) * 2) + parseInt(mod, 10);
		} else if ((matches = input.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?]$/))) {
			// Steam3 ID
			let [_, typeChar, universe, accountid, instanceid] = matches;

			this.universe = parseInt(universe, 10);
			this.accountid = parseInt(accountid, 10);

			if (instanceid) {
				this.instance = parseInt(instanceid.substring(1), 10);
			}

			switch (typeChar) {
				case 'U':
					// Individual. If we don't have an explicit instanceid, default to DESKTOP.
					this.type = SteamID.Type.INDIVIDUAL;
					if (!instanceid) {
						this.instance = SteamID.Instance.DESKTOP;
					}
					break;

				case 'c':
					this.instance |= SteamID.ChatInstanceFlags.Clan;
					this.type = SteamID.Type.CHAT;
					break;

				case 'L':
					this.instance |= SteamID.ChatInstanceFlags.Lobby;
					this.type = SteamID.Type.CHAT;
					break;

				default:
					this.type = getTypeFromChar(typeChar);
			}
		} else {
			throw new Error(`Unknown SteamID input format "${input}"`);
		}
	}

	static fromIndividualAccountID(accountid) {
		if (typeof accountid == 'bigint') {
			accountid = Number(accountid);
		}

		let parsed = parseInt(accountid, 10);
		if (isNaN(parsed)) {
			// writes to stderr in node
			console.error(`[steamid] Warning: SteamID.fromIndividualAccountID() called with NaN argument "${accountid}" (type "${typeof accountid}")`);
			parsed = 0;
		}

		let sid = new SteamID();
		sid.universe = SteamID.Universe.PUBLIC;
		sid.type = SteamID.Type.INDIVIDUAL;
		sid.instance = SteamID.Instance.DESKTOP;
		sid.accountid = parsed;
		return sid;
	}

	isValid() {
		fixTypes(this);

		if (this.type <= SteamID.Type.INVALID || this.type > SteamID.Type.ANON_USER) {
			return false;
		}

		if (this.universe <= SteamID.Universe.INVALID || this.universe > SteamID.Universe.DEV) {
			return false;
		}

		if (this.type == SteamID.Type.INDIVIDUAL && (this.accountid === 0 || this.instance > SteamID.Instance.WEB)) {
			return false;
		}

		if (this.type == SteamID.Type.CLAN && (this.accountid === 0 || this.instance != SteamID.Instance.ALL)) {
			return false;
		}

		if (this.type == SteamID.Type.GAMESERVER && this.accountid === 0) {
			return false;
		}

		return true;
	}

	isGroupChat() {
		fixTypes(this);
		return !!(this.type == SteamID.Type.CHAT && this.instance & SteamID.ChatInstanceFlags.Clan);
	}

	isLobby() {
		fixTypes(this);
		return !!(this.type == SteamID.Type.CHAT && (this.instance & SteamID.ChatInstanceFlags.Lobby || this.instance & SteamID.ChatInstanceFlags.MMSLobby));
	}

	steam2(newerFormat = false) {
		fixTypes(this);
		if (this.type != SteamID.Type.INDIVIDUAL) {
			throw new Error('Can\'t get Steam2 rendered ID for non-individual ID');
		} else {
			let universe = this.universe;
			if (!newerFormat && universe === 1) {
				universe = 0;
			}

			return `STEAM_${universe}:${this.accountid & 1}:${Math.floor(this.accountid / 2)}`;
		}
	}

	getSteam2RenderedID(newerFormat = false) {
		return this.steam2(newerFormat);
	}

	steam3() {
		fixTypes(this);
		let typeChar = SteamID.TypeChars[this.type] || 'i';

		if (this.instance & SteamID.ChatInstanceFlags.Clan) {
			typeChar = 'c';
		} else if (this.instance & SteamID.ChatInstanceFlags.Lobby) {
			typeChar = 'L';
		}

		let shouldRenderInstance = (
			this.type == SteamID.Type.ANON_GAMESERVER ||
			this.type == SteamID.Type.MULTISEAT ||
			(
				this.type == SteamID.Type.INDIVIDUAL &&
				this.instance != SteamID.Instance.DESKTOP
			)
		);

		return `[${typeChar}:${this.universe}:${this.accountid}${shouldRenderInstance ? `:${this.instance}` : ''}]`;
	}

	getSteam3RenderedID() {
		return this.steam3();
	}

	getSteamID64() {
		return this.getBigIntID().toString();
	}

	toString() {
		return this.getSteamID64();
	}

	getBigIntID() {
		fixTypes(this);
		let universe = BigInt(this.universe);
		let type = BigInt(this.type);
		let instance = BigInt(this.instance);
		let accountid = BigInt(this.accountid);

		return (universe << 56n) | (type << 52n) | (instance << 32n) | accountid;
	}
}

// Private methods/functions
function getTypeFromChar(typeChar) {
	let charEntry = Object.entries(SteamID.TypeChars).find(([entryType, entryChar]) => entryChar == typeChar);
	return charEntry ? parseInt(charEntry[0], 10) : SteamID.Type.INVALID;
}

function fixTypes(sid) {
	['universe', 'type', 'instance', 'accountid'].forEach((prop) => {
		if (typeof sid[prop] == 'bigint') {
			// Not sure how this would ever happen, but fix it
			sid[prop] = Number(sid[prop]);
		} else {
			let val = parseInt(sid[prop], 10);
			if (!isNaN(val)) {
				sid[prop] = val;
			}
		}
	});
}

module.exports = SteamID;
