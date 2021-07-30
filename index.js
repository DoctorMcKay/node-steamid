class SteamID {
	/**
	 * List of possible universes
	 * @static
	 * @returns {{DEV: number, INTERNAL: number, PUBLIC: number, INVALID: number, BETA: number}}
	 */
	static get Universe() {
		return {
			INVALID: 0,
			PUBLIC: 1,
			BETA: 2,
			INTERNAL: 3,
			DEV: 4
		};
	}

	/**
	 * List of possible types
	 * @static
	 * @returns {{CHAT: number, P2P_SUPER_SEEDER: number, GAMESERVER: number, CLAN: number, ANON_USER: number, MULTISEAT: number, ANON_GAMESERVER: number, PENDING: number, CONTENT_SERVER: number, INVALID: number, INDIVIDUAL: number}}
	 */
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

	/**
	 * List of named instances
	 * @static
	 * @returns {{ALL: number, CONSOLE: number, WEB: number, DESKTOP: number}}
	 */
	static get Instance() {
		return {
			ALL: 0,
			DESKTOP: 1,
			CONSOLE: 2,
			WEB: 4
		};
	}

	/**
	 * Mapping of SteamID types to their characters
	 * @static
	 * @returns {object}
	 */
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

	/**
	 * Mask to be used to get the AccountID out of a 64-bit SteamID
	 * @static
	 * @returns {number}
	 */
	static get AccountIDMask() { return 0xFFFFFFFF; }

	/**
	 * Mask to be used to get the instance out of the upper 32 bits of a 64-bit SteamID
	 * @static
	 * @returns {number}
	 */
	static get AccountInstanceMask() { return 0x000FFFFF; }

	/**
	 * Flags in SteamID instance for chat type IDs
	 * @static
	 * @returns {{Lobby: number, Clan: number, MMSLobby: number}}
	 */
	static get ChatInstanceFlags() {
		return {
			Clan: (SteamID.AccountInstanceMask + 1) >> 1,
			Lobby: (SteamID.AccountInstanceMask + 1) >> 2,
			MMSLobby: (SteamID.AccountInstanceMask + 1) >> 3
		};
	}

	/**
	 * Create a new SteamID object.
	 * @param {string|BigInt} [input] - BigInt containing 64-bit SteamID, or string containing 64-bit SteamID/Steam2/Steam3 text formats. If omitted, creates a blank SteamID object.
	 */
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

	/**
	 * Creates a new SteamID object from an individual account ID.
	 * @static
	 * @param {int|BigInt|string} accountid
	 * @returns {SteamID}
	 */
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

	/**
	 * Returns whether Steam would consider a given ID to be "valid".
	 * This does not check whether the given ID belongs to a real account, nor does it check that the given ID is for
	 * an individual account or in the public universe.
	 * @returns {boolean}
	 */
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

		// noinspection RedundantIfStatementJS
		if (this.type == SteamID.Type.GAMESERVER && this.accountid === 0) {
			return false;
		}

		return true;
	}

	/**
	 * Returns whether this SteamID is valid and belongs to an individual user in the public universe with a desktop instance.
	 * This is what most people think of when they think of a SteamID. Does not check whether the account actually exists.
	 * @returns {boolean}
	 */
	isValidIndividual() {
		return this.universe == SteamID.Universe.PUBLIC
			&& this.type == SteamID.Type.INDIVIDUAL
			&& this.instance == SteamID.Instance.DESKTOP
			&& this.isValid();
	}

	/**
	 * Checks whether the given ID is for a legacy group chat.
	 * @returns {boolean}
	 */
	isGroupChat() {
		fixTypes(this);
		return !!(this.type == SteamID.Type.CHAT && this.instance & SteamID.ChatInstanceFlags.Clan);
	}

	/**
	 * Check whether the given Id is for a game lobby.
	 * @returns {boolean}
	 */
	isLobby() {
		fixTypes(this);
		return !!(this.type == SteamID.Type.CHAT && (this.instance & SteamID.ChatInstanceFlags.Lobby || this.instance & SteamID.ChatInstanceFlags.MMSLobby));
	}

	/**
	 * Renders the ID in Steam2 format (e.g. "STEAM_0:0:23071901")
	 * @param {boolean} [newerFormat=false] - If true, use 1 as the first digit instead of 0 for the public universe
	 * @returns {string}
	 */
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

	/**
	 * Renders the ID in Steam2 format (e.g. "STEAM_0:0:23071901")
	 * @param {boolean} [newerFormat=false] - If true, use 1 as the first digit instead of 0 for the public universe
	 * @returns {string}
	 */
	getSteam2RenderedID(newerFormat = false) {
		return this.steam2(newerFormat);
	}

	/**
	 * Renders the ID in Steam3 format (e.g. "[U:1:46143802]")
	 * @returns {string}
	 */
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

	/**
	 * Renders the ID in Steam3 format (e.g. "[U:1:46143802]")
	 * @returns {string}
	 */
	getSteam3RenderedID() {
		return this.steam3();
	}

	/**
	 * Renders the ID in 64-bit decimal format, as a string (e.g. "76561198006409530")
	 * @returns {string}
	 */
	getSteamID64() {
		return this.getBigIntID().toString();
	}

	/**
	 * Renders the ID in 64-bit decimal format, as a string (e.g. "76561198006409530")
	 * @returns {string}
	 */
	toString() {
		return this.getSteamID64();
	}

	/**
	 * Renders the ID in 64-bit decimal format, as a BigInt (e.g. 76561198006409530n)
	 * @returns {BigInt}
	 */
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
