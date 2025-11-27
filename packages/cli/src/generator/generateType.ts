import fs from "node:fs";
import path from "node:path";

export async function generateTypeFiles(output: string, typeRecord: Record<string, string>) {
	const folderOutput = path.resolve(output, "./@types");
	await fs.promises.mkdir(folderOutput);
	for (const name in typeRecord) {
		const fileOutput = path.resolve(folderOutput, name);
		console.log(`📦 正在构建: ${name}`);
		await fs.promises.writeFile(fileOutput, typeRecord[name]!, {
			encoding: "utf-8"
		});
	}
}
