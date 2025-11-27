export async function parseTypes(model: any) {
	if (!model.components && !model.components.schemas) {
		throw new Error("该接口文档不存在数据类型!");
	}
	const TypeFileRecord: Record<string, string> = {};
	const schemas = model.components.schemas;
	for (const name in schemas) {
		const schema = schemas[name];
		let folder: string = schema["x-apifox-folder"] || "default"; // 没有目录文件默认放 default.d.ts
		folder += ".d.ts";
		if (TypeFileRecord[folder] === void 0) {
			TypeFileRecord[folder] = "";
		}
		if (schema.type === "object") {
			// 是对象我们使用 interface 定义接口
			TypeFileRecord[folder] += "interface " + name + " " + parseType(schema, 0) + "\n\n";
		} else {
			TypeFileRecord[folder] += "type " + name + " = " + parseType(schema, 0) + "\n\n";
		}
	}
	return TypeFileRecord;
}

// 为了生成对象类型的美观,我们会用此函数处理对象缩进问题(我艹我忘了其实可以用prettier QAQ)
const loopPrint = (str: string, loop: number = 1): string => {
	let result = "";
	if (loop <= 0) {
		return result;
	}
	for (let i = 0; i < loop; i++) {
		result += str;
	}
	return result;
};

export const parseObject = (obj: { [key: string]: any }, required: Array<string> = [], level = 1): string => {
	let result = "{\n";
	for (const prop in obj) {
		// 获取这个对象的属性名
		let type = obj[prop].type;
		result += loopPrint("\t", level);
		result += prop + (required.includes(prop) ? "" : "?") + ": ";
		type = parseType(obj[prop], level);
		result += type + "\n";
	}
	result += loopPrint("\t", level - 1) + "}";
	return result;
};

export const parseArray = (arr: { [key: string]: any }, level = 0): string => {
	let result = "Array<";
	let type = arr.items.type;
	type = parseType(arr.items, level);
	result += type + ">";
	return result;
};

export const parseUnion = (obj: { [key: string]: any }, level = 0): string => {
	const connection = Object.hasOwn(obj, "allOf") ? "allOf" : "anyOf";
	const connectSymbol = Object.hasOwn(obj, "allOf") ? "&" : "|";
	let result = "";
	for (const item of obj[connection]) {
		const type = parseType(item, level);
		result += `${type} ${connectSymbol} `;
	}
	return result.substring(0, result.length - 3);
};

// 分析一个类型(具体情况具体分析)
export const parseType = (schema: { [key: string]: any }, level = 0): string => {
	let type = schema.type;
	let isNull = false;
	// 处理类型 允许 为 null
	if (Array.isArray(type) && type[1] === "null") {
		isNull = true;
		type = type[0];
	}
	if (type === "object") {
		// 处理类型是对象的情况 object
		type = parseObject(schema.properties, schema.required, level + 1);
	} else if (type === "array") {
		// 处理类型是数组的情况 array
		type = parseArray(schema, level);
	} else if (!type && Object.hasOwn(schema, "$ref")) {
		// 处理引用数据类型的情况 $ref
		const index = schema.$ref.lastIndexOf("/");
		type = schema.$ref.substring(index + 1, schema.$ref.length);
		// 记录引用,后续处理
	} else if (!type && (Object.hasOwn(schema, "allOf") || Object.hasOwn(schema, "anyOf"))) {
		// 联合类型 交叉类型 allOf -> & anyOf -> |
		type = parseUnion(schema, level);
	} else if (type === "integer") {
		// 普通类型 integer -> number
		type = "number";
	}
	type += isNull ? " | null" : "";
	return type;
};
