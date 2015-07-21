module.exports = SteamID;

var UInt64 = require('cuint').UINT64;

// Universe constants
SteamID.Universe = {
	"INVALID": 0,
	"PUBLIC": 1,
	"BETA": 2,
	"INTERNAL": 3,
	"DEV": 4
};

// Type constants
SteamID.Type = {
	"INVALID": 0,
	"INDIVIDUAL": 1,
	"MULTISEAT": 2,
	"GAMESERVER": 3,
	"ANON_GAMESERVER": 4,
	"PENDING": 5,
	"CONTENT_SERVER": 6,
	"CLAN": 7,
	"CHAT": 8,
	"P2P_SUPER_SEEDER": 9,
	"ANON_USER": 10
};

// Instance constants
SteamID.Instance = {
	"ALL": 0,
	"DESKTOP": 1,
	"CONSOLE": 2,
	"WEB": 4
};

// Type chars
SteamID.TypeChars = {};
SteamID.TypeChars[SteamID.Type.INVALID] = 'I';
SteamID.TypeChars[SteamID.Type.INDIVIDUAL] = 'U';
SteamID.TypeChars[SteamID.Type.MULTISEAT] = 'M';
SteamID.TypeChars[SteamID.Type.GAMESERVER] = 'G';
SteamID.TypeChars[SteamID.Type.ANON_GAMESERVER] = 'A';
SteamID.TypeChars[SteamID.Type.PENDING] = 'P';
SteamID.TypeChars[SteamID.Type.CONTENT_SERVER] = 'C';
SteamID.TypeChars[SteamID.Type.CLAN] = 'g';
SteamID.TypeChars[SteamID.Type.CHAT] = 'T';
SteamID.TypeChars[SteamID.Type.ANON_USER] = 'a';

SteamID.AccountIDMask = 0xFFFFFFFF;
SteamID.AccountInstanceMask = 0x000FFFFF;

SteamID.ChatInstanceFlags = {
	"Clan": (SteamID.AccountInstanceMask + 1) >> 1,
	"Lobby": (SteamID.AccountInstanceMask + 1) >> 2,
	"MMSLobby": (SteamID.AccountInstanceMask + 1) >> 3
};

function SteamID(input) {
	// Instance variables
	this.universe = SteamID.Universe.INVALID;
	this.type = SteamID.Type.INVALID;
	this.instance = SteamID.Instance.ALL;
	this.accountid = 0;
	
	if(!input) {
		// Use the default invalid values
		return;
	}
	
	var matches;
	if((matches = input.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/))) {
		// Steam2 ID
		this.universe = parseInt(matches[1], 10) || SteamID.Universe.PUBLIC; // If it's 0, turn it into 1 for public
		this.type = SteamID.Type.INDIVIDUAL;
		this.instance = SteamID.Instance.DESKTOP;
		this.accountid = (parseInt(matches[3], 10) * 2) + parseInt(matches[2], 10);
	} else if((matches = input.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/))) {
		// Steam3 ID
		this.universe = parseInt(matches[2], 10);
		this.accountid = parseInt(matches[3], 10);
		
		var typeChar = matches[1];
		
		if(matches[4]) {
			this.instance = parseInt(matches[4].substring(1), 10);
		} else if(typeChar == 'U') {
			this.instance = SteamID.Instance.DESKTOP;
		}
		
		if(typeChar == 'c') {
			this.instance |= SteamID.ChatInstanceFlags.Clan;
			this.type = SteamID.Type.CHAT;
		} else if(typeChar == 'L') {
			this.instance |= SteamID.ChatInstanceFlags.Lobby;
			this.type = SteamID.Type.CHAT;
		} else {
			this.type = getTypeFromChar(typeChar);
		}
	} else if(isNaN(input)) {
		throw new Error("Unknown input format");
	} else {
		var num = new UInt64(input, 10);
		this.accountid = num.toNumber() & 0xFFFFFFFF;
		this.instance = num.shiftRight(32).toNumber() & 0xFFFFF;
		this.type = num.shiftRight(20).toNumber() & 0xF;
		this.universe = num.shiftRight(4).toNumber();
	}
}

SteamID.prototype.isValid = function() {
	if(this.type <= SteamID.Type.INVALID || this.type > SteamID.Type.ANON_USER) {
		return false;
	}
	
	if(this.universe <= SteamID.Universe.INVALID || this.universe > SteamID.Universe.DEV) {
		return false;
	}
	
	if(this.type == SteamID.Type.INDIVIDUAL && (this.accountid === 0 || this.instance > SteamID.Instance.WEB)) {
		return false;
	}
	
	if(this.type == SteamID.Type.CLAN && (this.accountid === 0 || this.instance != SteamID.Instance.ALL)) {
		return false;
	}
	
	if(this.type == SteamID.Type.GAMESERVER && this.accountid === 0) {
		return false;
	}
	
	return true;
};

SteamID.prototype.getSteam2RenderedID = function(newerFormat) {
	if(this.type != SteamID.Type.INDIVIDUAL) {
		throw new Error("Can't get Steam2 rendered ID for non-individual ID");
	} else {
		var universe = this.universe;
		if(!newerFormat && universe === 1) {
			universe = 0;
		}
		
		return "STEAM_" + universe + ':' + (this.accountid & 1) + ':' + Math.floor(this.accountid / 2);
	}
};

SteamID.prototype.getSteam3RenderedID = function() {
	var typeChar = SteamID.TypeChars[this.type] || 'i';
	
	if(this.instance & SteamID.ChatInstanceFlags.Clan) {
		typeChar = 'c';
	} else if(this.instance & SteamID.ChatInstanceFlags.Lobby) {
		typeChar = 'L';
	}
	
	var renderInstance = (this.type == SteamID.Type.ANON_GAMESERVER || this.type == SteamID.Type.MULTISEAT || (this.type == SteamID.Type.INDIVIDUAL && this.instance != SteamID.Instance.DESKTOP));
	return '[' + typeChar + ':' + this.universe + ':' + this.accountid + (renderInstance ? ':' + this.instance : '') + ']';
};

SteamID.prototype.getSteamID64 = function() {
	return new UInt64(this.accountid, (this.universe << 24) | (this.type << 20) | (this.instance)).toString();
};

SteamID.prototype.toString = SteamID.prototype.getSteamID64;

// Private methods/functions
function getTypeFromChar(typeChar) {
	for(var type in SteamID.TypeChars) {
		if(SteamID.TypeChars[type] == typeChar) {
			return parseInt(type, 10);
		}
	}
	
	return SteamID.Type.INVALID;
}
