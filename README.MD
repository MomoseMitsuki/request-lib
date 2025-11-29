# request-lib

## 简介

适配项目开发中遇到的所有请求场景，诸如请求并发、串行、幂等、缓存等。同时包含自动化工具，用于根据接口文档生成请求样板代码。

请求库不仅完全消除了不同框架间重复的请求代码，极大的缩短了接口联调的时间，为业务开发提效30%，同时带来了更高的可维护性。

## 设计

### request-lib

整个库结构包含三层，从下往上依次是：

- request-imp： 提供请求基本功能

- request-core： 提供网络上层控制，比如请求串行、请求并行、请求重试、请求防重等功能

- request-bus： 自行书写，为请求绑定业务功能，该层接入公司内部协议规范和接口文档，向外提供业务接口API

在结构上，考虑到请求基础库的具体实现方式可能有变动，必须由xhr换成axios或者fetch，为了减少变动对上层代码造成的改动，应用DIP原则，参考了后端的IOC和DI，让核心库不依赖具体的请求基础库，核心库仅提供TS接口，请求基础库可以基于接口提供不同的实现方式，在业务库注入具体实现即可，这样一来，就彻底隔离了请求的具体实现，将来实现变动后可以轻易的接入。

### template-cli

上层业务库由于深度绑定业务的接口文档，可能我们项目中的接口数量非常庞大，为了减少开发和维护成本，使用node实现了一个自动化工具，通过解析接口标准文档，自动为每个接口生成请求样板代码，并且考虑到某些样板代码可能不符合实际需要，我制定了一种可以基于样板代码打补丁的开发方式。这样既减少了开发量，同时也保证了灵活度。

## 使用

### request-lib

1. 安装

```powershell
npm i @momosemitsuki/request-lib            # npm

yarn add @momosemitsuki/request-lib         # yarn

pnpm add @momosemitsuki/request-lib         # pnpm
```

2. 在业务层导入

导入请求对象的具体实现

```typescript
import { requestor } from "@momosemitsuki/request-lib/axios-imp"
// 如果使用axios的实现记得下载axios哦
```

将来如果改为使用fetch api完成请求，仅需做以下改动：
```typescript
- import { requestor } from 'request-axios-imp';
+ import { requestor } from 'request-fetch-imp';
```

3. 注入请求实例对象

```typescript
import { inject, useRequestor } from "@momosemitsuki/request-lib"
inject(requestor)

const req = useRequestor()      // 通过useRequestor()拿到基础请求对象
req.baseUrl         // 默认是当前页面源
```

我们可以通过 req 实现无上层功能的基础请求

```typescript
req.get("./xxx")
```

4. 实现上层功能的请求

- createRetryRequestor(maxCount = 5)

创建一个带请求重试的对象,请求失败自动进行重新请求,maxCount为最大重试次数,默认为5

- createParallelRequestor(maxCount = 4)

创建一个带请求并发的对象,本次请求采取并发限制,maxCount为最大并发个数,默认为4

- createCacheRequestor(cacheOptions: CacheOptions)

创建一个带请求缓存的对象,参数为 CacheOptions,当没有命中缓存时发送请求并缓存结果，当有缓存时直接返回缓存

```typescript
interface CacheOptions {
	duration: number;           // 指示缓存的时间,单位毫秒,isValid该属性失效
	store: CacheStore;          // 缓存仓库类型
	key: (config: RequestOptions) => string;        // 自定义缓存键,默认使用path作为键
	isValid?: (key: string, config: RequestOptions) => Promise<boolean>;        
    // 自定义缓存是否有效，提供该配置后，duration配置失效
    // key表示缓存键， config表示此次请求配置
    // 返回true表示缓存有效，返回false缓存无效。
}
```

存储有多种方案，不同的方案能够存储的格式不同、支持的功能不同、使用的API不同、兼容性不同

为了抹平这种差异，避免将来存储方案变动时对其他代码造成影响，需要设计一个稳定的接口来屏蔽方案间的差异

```typescript
interface CacheStore {
	has(key: string): Promise<boolean>;
	get<T>(key: string): Promise<T>;
	set<T>(key: string, ...values: Array<T>): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}
```

如何使用
```typescript
import { localStorageStore } from "../request-store";
// import { sessionStorageStore } from "../request-store";
const req = createCacheRequestor({
    duration: 1000 * 60 * 60,
    key:(config) => config.pathname!,
    store: localStorageStore // 使用 localStorageStore 
});
```
- createSerialRequestor()

创建一个带请求串行的对象,上一个请求返回拿到响应之后才进行请求

- createIdempotentRequestor(genKey?: (config: RequestOptions) => string)

创建一个带请求幂等的对象

幂等性是一个数学概念，常见于抽象代数

$f(n) = 1^n$ 无论n的值是多少，f(n)不变为1

在网络请求中，很多接口都要求幂等性，比如支付，同一订单多次支付和一次支付对用户余额的影响应该是一样的。

要解决这一问题，就必须保证： **要求幂等的请求不能重复提交**

这里的关键问题就在于定义什么是重复？

我们可以把重复定义为： 请求方法、请求头、请求体完全一致

因此，我们可以使用hash将它们编码成一个字符串

```typescript
function hashRequest(opt: RequestOptions) {
	const spark = new SparkMD5();
	if (opt.url) spark.append(opt.url);
	if (opt.headers) {
		const keys = Object.keys(opt.headers);
		for (const key of keys) {
			spark.append(key);
			spark.append(opt.headers[key]!);
		}
	}
	if (opt.body) spark.append(opt.body);
	return spark.end();
}
```

当请求幂等时，直接返回缓存结果即可

在实现上，直接利用缓存功能实现

```typescript
export function createIdempotentRequestor(genKey?: (config: RequestOptions) => string) {
	return createCacheRequestor({
		key: config => (genKey ? genKey(config) : hashRequest(config)),
		duration: 1000 * 60 * 60,
		store: sessionStorageStore
	});
}
```

5. 采用IIFE+闭包隔绝每一个API函数请求对象的差异性(见下面demo)

```typescript
import { inject, useRequestor } from "@momosemitsuki/request-lib"
import { requestor } from "@momosemitsuki/request-lib/fetch-imp"

inject(requestor)
const req = useRequestor()

/**
 * 发布文章
 */
export const publishArticle = (() => {
  const req = createIdempotentRequest();
  return async (article: Article) => {
    return req.post('/api/article', article).then(resp=>resp.json())
  }
})();


/**
 * 获取文章
 */
export const getArticles = (() => {
  return async (page: number, size: number) => {
    return req.get('/api/article', {
      params:{
        page,
        size
      }
    }).then(resp=>resp.json())
  }
})();
```

### template-cli

#### 安装

```powershell
npm i @momosemitsuki/template-cli -D            # npm

yarn add @momosemitsuki/template-cli -D         # yarn

pnpm add @momosemitsuki/template-cli -D         # pnpm
```

#### 新建配置文件

```json
// 在项目根目录新建 template.config.json
{
    "typescript": true,          // 是否使用typescript
    "requestor": "fetch",        // 使用的请求对象   xhr | axios | fetch
    "entry": "./openapi.json",   // 接口文档的位置(基于命令行所在的目录)
    "output": "./request-lib"    // 生成的模板代码位置(基于命令行所在的目录)
}
```
#### 运行构建命令

```powershell
npx build:template
```