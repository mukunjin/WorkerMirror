# WorkerMirror

基于 Cloudflare Workers 的网站反向代理镜像脚本，支持 Basic Auth 认证、移动端适配、地区/IP 屏蔽及响应内容替换。

## 功能

- Basic Auth 访问认证
- 桌面端 / 移动端分别代理到不同上游域名
- 按国家代码屏蔽访问
- 按 IP 地址屏蔽访问
- 自动移除上游的 CSP 和 Clear-Site-Data 响应头
- 对 text/html 响应进行域名替换
- 跨域支持 (CORS)

## 配置

打开 `worker.js`，修改顶部配置项：

```js
// 认证
const USERNAME = "user"
const PASSWORD = "12345"

// 上游配置
const upstream = 'example.com'        // 桌面端上游域名
const upstream_mobile = 'example.com' // 移动端上游域名
const upstream_path = '/'             // 上游路径前缀

// 访问控制
const blocked_region = ['KP', 'SY', 'PK', 'CU']
const blocked_ip_address = ['0.0.0.0', '127.0.0.1']

// 协议
const https = true

// 响应文本替换 (键为查找目标，值为替换内容)
// 支持特殊占位符: $upstream -> 上游域名, $custom_domain -> Workers 绑定域名
const replace_dict = {
  '$upstream': '$custom_domain',
  '//github.com': ''
}
```

## 部署

### 方式一：Cloudflare Dashboard

1. 登录 Cloudflare Dashboard，进入 Workers & Pages
2. 点击 Create Application -> Upload your static files
3. 选择worker.js文件
4. 点击 Save and Deploy
5. 去Domains页面，绑定你的域名（可选）

### 方式二：Wrangler CLI

1. 安装 Wrangler：

```bash
npm install -g wrangler
```

2. 登录：

```bash
wrangler login
```

3. 初始化项目（如果尚未初始化）：

```bash
wrangler init
```

4. 将 `worker.js` 的内容复制到 `src/index.js`（或按 `wrangler.toml` 中 `main` 字段指定的路径）

5. 部署：

```bash
wrangler deploy
```

## 文本替换说明

`replace_dict` 中的键值对会依次作为正则表达式进行全局替换。键和值均支持以下占位符：

| 占位符 | 实际值 |
|---|---|
| `$upstream` | 上游域名（如 `example.com`） |
| `$custom_domain` | Workers 绑定的域名 |

非占位符的键会直接作为正则模式匹配，特殊字符（`.`、`*` 等）已自动转义。

## 注意事项

- 建议将用户名和密码通过 Cloudflare Workers 的 Secrets 或环境变量管理，避免硬编码在源码中
- `blocked_ip_address` 仅支持 IPv4 地址匹配
- 仅对 `content-type` 包含 `text/html` 且包含 `utf-8` 的响应执行文本替换，其他类型直接透传
