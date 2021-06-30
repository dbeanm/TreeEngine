class AddLayerError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddLayerError";
	}
}

class AddEdgeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddEdgeError";
	}
}

class VariableTypeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "VariableTypeError";
	}
}

class AddUnitError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddUnitError";
	}
}

class ModelExecutionError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "ModelExecutionError";
	}
}

class DuplicateEntryError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "DuplicateEntryError";
	}
}