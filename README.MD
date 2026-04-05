# @MomoseMitsuki/request-lib

@momosemitsuki/request-lib 是一个具备基础并附带上层功能的请求库, 适配项目开发中遇到的所有请求场景，诸如请求并发、串行、幂等、缓存等

## 安装

- npm
```powershell
npm install @momosemitsuki/request-lib
```

- yarn
```powershell
yarn add @momosemitsuki/request-lib
```

- pnpm
```powershell
pnpm install @momosemitsuki/request-lib
```

## 使用

### 基础功能

#### 普通请求

在使用之前, 需要先导入
```typescript
import { inject, useRequestor } from "@momosemitsuki/request-lib"
import { Requestor } from "@momosemitsuki/request-lib/fetch"

inject(new Requestor("http://api.example.com"))
const req = useRequestor()
```

此案例使用 `fetch api` 为底层完成请求, 你可以切换为 `axios` 或 `xhr`
使用 axios 请自行下载依赖:

```typescript
import { inject } from 'request-core';
import { requestor } from 'request-axios-imp';
inject(requestor);
```

之后可以使用此对象完成简单的请求:

```typescript
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

export const postArticles = (() => {
    return async (body:string) => {
        return req.post('/api/article', {
            body
        }).then(resp=>resp.json())
    }
})();
```

#### EventEmitter

在 Requestor 对象上有两个event事件`beforeRequest`和`responseBody`

```typescript
req.on("beforeRequest",(config) => {
    console.log(config)
})
req.on("responseBody",(config,resp) => {
    console.log(config,resp)
})
```

### 上层功能

#### 请求重试

创建一个带重试功能的请求, 如果内部发生错误自动捕获并自行重试， 默认重试次数 5

```typescript
const req = createRetryRequestor()
```

#### 请求超时

创建一个带超时功能的请求, 超出时间返回错误对象, 默认超时时间 3000ms

```typescript
const req = createTimeoutRequestor()
```

#### 请求并发

创建一个带并发功能的请求, 默认并发数量为 4

```typescript
const req = createParallelRequestor()
```

#### 请求串行

创建一个带串行功能的请求

```typescript
const req = createSerialRequestor()
```

#### 请求缓存

创建一个带有缓存的请求，当没有命中缓存时发送请求并缓存结果，当有缓存时直接返回缓存。

```typescript
const req = createCacheRequestor({
    key (config:RequestConfig) {
  	    // config为某次请求的配置
  	    return config.pathname; // 使用pathname作为缓存键
	},
    persist: true // 是否开启持久化缓存
    duration: 1000 * 60 * 60, // 指示缓存的时间，单位毫秒
    isValid(key: string, config: RequestConfig){ // 自定义缓存是否有效，提供该配置后，duration配置失效
        // key表示缓存键， config表示此次请求配置
        // 返回true表示缓存有效，返回false缓存无效。
    },
});
req.get('/a'); // 请求
req.get('/a'); // 使用缓存
req.get('/b'); // 请求
req.get('/b'); // 使用缓存
```
#### 请求幂等

基于请求缓存实现, 幂等的请求不能重复提交
默认缓存键位 url params headers body 拼出来的 sparkmd5 hash

```typescript
function createIdempotentRequestor(genKey){
    return createCacheRequestor({
        key: (config) => genKey ? genKey(config) : hashRequest(config),
        persist: false               
    });
}
```

#### 请求取消

创建一个带取消功能的请求, 发送下一个请求之前自动取消上一个请求, 返回一个 AbortError

```typescript
const req = createAbortableRequestor()
req.get("/api/news")   // 被取消 abort
req.get("/api/news")
```

## 贡献

如果您在使用 @momosemitsuki/request-lib 时遇到了问题，或者有任何建议和想法，请随时在 GitHub 上提出问题或者发起 PR。

## 许可证

@momosemitsuki/request-lib 遵循 MIT 许可证。详情请参阅 LICENSE 文件。