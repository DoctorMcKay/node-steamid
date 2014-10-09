module.exports = SteamID;

var UInt64 = require('cuint').UINT64;

// Universe constants
SteamID.Universe = {
	"INVALID": 0,
	"PUBLIC": 1,
	"BETA": 2,
	"INTERNAL": 3,
	"DEV": 4,
	"RC": 5
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
		this.universe = parseInt(matches[1]) || SteamID.Universe.PUBLIC; // If it's 0, turn it into 1 for public
		this.type = SteamID.Type.INDIVIDUAL;
		this.instance = SteamID.Instance.DESKTOP;
		this.accountid = (parseInt(matches[3]) * 2) + parseInt(matches[2]);
	} else if((matches = input.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/))) {
		this.type = getTypeFromChar(matches[1]);
		this.universe = parseInt(matches[2]);
		this.accountid = parseInt(matches[3]);
		
		if(!matches[4]) {
			if(this.type == SteamID.Type.INDIVIDUAL) {
				this.instance = SteamID.Instance.DESKTOP;
			} else {
				this.instance = SteamID.Instance.ALL;
			}
		} else {
			this.instance = parseInt(matches[4].substring(1));
		}
	} else if(isNaN(input)) {
		throw new Error("Unknown input format");
	} else {
		var bits = padWithZeroes(new UInt64(input).toString(2), 64);
		this.universe = parseInt(bits.substring(0, 8), 2);
		this.type = parseInt(bits.substring(8, 12), 2);
		this.instance = parseInt(bits.substring(12, 32), 2);
		this.accountid = parseInt(bits.substring(32), 2);
	}
}

SteamID.prototype.isValid = function() {
	return (this.universe != SteamID.Universe.INVALID && this.type != SteamID.Type.INVALID);
};

SteamID.prototype.getSteam2RenderedID = function() {
	if(this.type != SteamID.Type.INDIVIDUAL) {
		throw new Error("Can't get Steam2 rendered ID for non-individual ID");
	} else {
		var universe = this.universe;
		if(universe === 1) {
			universe = 0;
		}
		
		return "STEAM_" + universe + ':' + (this.accountid & 1) + ':' + Math.floor(this.accountid / 2);
	}
};

SteamID.prototype.getSteam3RenderedID = function() {
	return '[' + SteamID.TypeChars[this.type] + ':' + this.universe + ':' + this.accountid + ']';
};

SteamID.prototype.getSteamID64 = function() {
	return new UInt64(this.accountid, (this.universe << 24) | (this.type << 20) | (this.instance)).toString();
};

// Private methods/functions
function getTypeFromChar(typeChar) {
	for(var type in SteamID.TypeChars) {
		if(SteamID.TypeChars[type] == typeChar) {
			return parseInt(type);
		}
	}
	
	return SteamID.Type.INVALID;
}

function padWithZeroes(text, length) {
	while(text.length < length) {
		text = '0' + text;
	}
	
	return text;
}