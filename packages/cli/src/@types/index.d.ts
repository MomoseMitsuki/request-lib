type FileApiRecord = Record<
	string,
	{
		imports: Set<string>;
		content: Array<FormatAPI>;
	}
>;

interface FormatAPI {
	method: string;
	name: string;
	path: string;
	parameters: Array<Parameter>;
	folder: string;
	Retry: number;
	Parallel: number;
	Idempotent: string;
	Cache: string;
	Serial: string;
	requestBody: string | undefined;
	responseBody: string | undefined;
}

interface Parameter {
	name: string;
	in: string;
	description: string;
	required: boolean;
	schema: string;
}
