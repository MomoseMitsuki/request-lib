import path from "node:path";
import fs from "node:fs";

const generateTemplateAPI = (api: FormatAPI, typescript: boolean) => {
	let params = "";
	let paramsNoType = "";
	for (const parameter of api.parameters) {
		if (parameter.in === "query") {
			params += parameter.name;
			params += typescript ? ": " + parameter.schema : "";
			params += ", ";
			paramsNoType += parameter.name + ", ";
		}
	}
	params = params.substring(0, params.length - 2);
	paramsNoType = paramsNoType.substring(0, paramsNoType.length - 2);
	let template = "export const " + api.name + " = (() => {\n";
	if (api.Retry && typeof api.Retry === "number") {
		template += `\tconst req = createRetryRequestor(${api.Retry})\n`;
	} else if (api.Parallel && typeof api.Retry === "number") {
		template += `\tconst req = createParallelRequestor(${api.Parallel})\n`;
	} else if (typeof api.Cache === "string" && api.Cache !== "false") {
		template += `\tconst req = createCacheRequestor()\n`;
	} else if (typeof api.Idempotent === "string" && api.Idempotent !== "false") {
		template += `\tconst req = createIdempotentRequestor()\n`;
	} else if (typeof api.Serial === "string" && api.Serial !== "false") {
		template += `\tconst req = createSerialRequestor()\n`;
	}
	template += "\treturn async (";
	template += params ? params : "";
	template += api.requestBody ? "data" : "";
	template += typescript && api.requestBody ? ": " + api.requestBody : "";
	template += ") => {\n";
	template += "\t\treturn req." + api.method + "('" + api.path + "'";
	template += paramsNoType ? ",{\n\t\t\tparams: { " + paramsNoType + " }\n\t\t}" : "";
	template += api.requestBody ? ",data" : "";
	template += ").then(resp => resp.json";
	template += typescript && api.responseBody && api.responseBody !== "{\n}" ? `<${api.responseBody}>` : "";
	template += "())\n";
	template += "\t}\n";
	template += "})()\n\n";
	return template;
};

export const generateApiFile = async (
	output: string,
	record: FileApiRecord,
	requestor: string,
	typescript: boolean
) => {
	const folderOutput = path.resolve(output, "./template");
	await fs.promises.mkdir(folderOutput);
	let indexContent = "";
	for (const fileName in record) {
		let content = "";
		indexContent += `export * from "./${typescript ? fileName.substring(0, fileName.length - 3) : fileName}";\n`;
		const importRequestorStr = record[fileName]!.imports.size
			? ", " + [...record[fileName]!.imports].join(", ")
			: "";
		content += `import { inject, useRequestor${importRequestorStr} } from "@momosemitsuki/request-lib"\n`;
		content += `import { requestor } from "@momosemitsuki/request-lib/${requestor}-imp"\n\n`;
		content += "inject(requestor)\n";
		content += "const req = useRequestor()\n\n";
		for (const formatApi of record[fileName]!.content) {
			const template = generateTemplateAPI(formatApi, typescript);
			content += template;
		}
		const fileOutput = path.resolve(folderOutput, fileName);
		console.log(`📦 正在构建: ${fileName}`);
		await fs.promises.writeFile(fileOutput, content, {
			encoding: "utf-8"
		});
	}
	fs.promises.writeFile(path.resolve(folderOutput, typescript ? "index.ts" : "index.js"), indexContent, {
		encoding: "utf-8"
	});
};
