import fs from "node:fs";

export const clearDir = async (path: string) => {
	if (fs.existsSync(path)) {
		await fs.promises.rm(path, {
			force: true,
			recursive: true
		});
	}
	await fs.promises.mkdir(path);
};
