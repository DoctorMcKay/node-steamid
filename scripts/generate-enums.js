const FS = require('fs');
const Path = require('path');

const TypeData = {
	Universes: {
		INVALID: 0,
		PUBLIC: 1,
		BETA: 2,
		INTERNAL: 3,
		DEV: 4
	},

	Types: {
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
	},

	Instances: {
		ALL: 0,
		DESKTOP: 1,
		CONSOLE: 2,
		WEB: 4
	}
};

let fileHandle = FS.openSync(Path.resolve(__dirname, '..', 'src', 'enums.ts'), 'w');
FS.writeSync(fileHandle, '/* eslint-disable */\n\n');

for (let enumType in TypeData) {
	FS.writeSync(fileHandle, `export type Possible${enumType} = {\n`);
	for (let caseName in TypeData[enumType]) {
		FS.writeSync(fileHandle, `\t${caseName}: ${TypeData[enumType][caseName]},\n`);
	}
	FS.writeSync(fileHandle, `}\n\n`);

	FS.writeSync(fileHandle, `export enum ${enumType} {\n`);
	for (let caseName in TypeData[enumType]) {
		FS.writeSync(fileHandle, `\t${caseName} = ${TypeData[enumType][caseName]},\n`);
	}
	FS.writeSync(fileHandle, `}\n\n`);
}

FS.closeSync(fileHandle);
