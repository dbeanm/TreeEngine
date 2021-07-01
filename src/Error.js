export class AddLayerError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddLayerError";
	}
}

export class AddEdgeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddEdgeError";
	}
}

export class VariableTypeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "VariableTypeError";
	}
}

export class AddUnitError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddUnitError";
	}
}

export class ModelExecutionError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "ModelExecutionError";
	}
}

export class DuplicateEntryError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "DuplicateEntryError";
	}
}