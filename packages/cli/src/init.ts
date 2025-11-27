import path from "node:path";
import fs from "node:fs";
import { clearDir } from "./utils";
import { generateTypeFiles } from "./generator/generateType";
import { generateApiFile } from "./generator/generateApi";
import { parseApi } from "./parse/parseApi";
import { parseTypes } from "./parse/parseType";

interface TemplateConfig {
	requestor: "fetch" | "axios" | "xhr";
	typescript: boolean;
	entry: string;
	output: string;
}

async function init() {
	const { requestor, typescript, entry, output } = await readConfig();
	await clearDir(output);
	const openApiJSON = await fs.promises.readFile(entry, {
		encoding: "utf-8"
	});
	const openApiModel = JSON.parse(openApiJSON);
	if (typescript) {
		const record = await parseTypes(openApiModel);
		await generateTypeFiles(output, record);
	}
	const record = await parseApi(openApiModel, typescript);
	await fs.promises.mkdir(path.resolve(output, "patch"));
	await generateApiFile(output, record, requestor, typescript);
	const fileType = typescript ? "index.ts" : "index.js";
	const indexPath = path.resolve(output, fileType);
	await fs.promises.writeFile(indexPath, `export * from "./template/${fileType}"\n`, {
		encoding: "utf-8"
	});
	console.log(`✅ 构建完成`);
}

async function readConfig() {
	const configPath = path.resolve(process.cwd(), "template.config.json");
	if (!fs.existsSync(configPath)) {
		throw new Error("Please build a template.config.json in your root");
	}
	const configJson = await fs.promises.readFile(configPath, {
		encoding: "utf-8"
	});
	const config = JSON.parse(configJson) as TemplateConfig;
	config.entry = path.resolve(process.cwd(), config.entry);
	config.output = path.resolve(process.cwd(), config.output);
	return config;
}

init();
