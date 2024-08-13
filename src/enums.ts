/* eslint-disable */

export type PossibleUniverses = {
	INVALID: 0,
	PUBLIC: 1,
	BETA: 2,
	INTERNAL: 3,
	DEV: 4,
}

export enum Universes {
	INVALID = 0,
	PUBLIC = 1,
	BETA = 2,
	INTERNAL = 3,
	DEV = 4,
}

export type PossibleTypes = {
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
	ANON_USER: 10,
}

export enum Types {
	INVALID = 0,
	INDIVIDUAL = 1,
	MULTISEAT = 2,
	GAMESERVER = 3,
	ANON_GAMESERVER = 4,
	PENDING = 5,
	CONTENT_SERVER = 6,
	CLAN = 7,
	CHAT = 8,
	P2P_SUPER_SEEDER = 9,
	ANON_USER = 10,
}

export type PossibleInstances = {
	ALL: 0,
	DESKTOP: 1,
	CONSOLE: 2,
	WEB: 4,
}

export enum Instances {
	ALL = 0,
	DESKTOP = 1,
	CONSOLE = 2,
	WEB = 4,
}

