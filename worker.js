//Basic Auth 配置
const USERNAME = "user"         //配置用户名
const PASSWORD = "12345"       //配置密码

// 你要镜像的网站
const upstream = 'example.com'

// 镜像网站的目录
const upstream_path = '/'

// 手机端
const upstream_mobile = 'example.com'

// 屏蔽国家
const blocked_region = ['KP', 'SY', 'PK', 'CU']

// 屏蔽 IP
const blocked_ip_address = ['0.0.0.0', '127.0.0.1']

// HTTPS
const https = true

// 文本替换
const replace_dict = {
  '$upstream': '$custom_domain',
  '//github.com': ''
}


function unauthorized() {
  return new Response("Authentication Required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="GitHub Mirror"'
    }
  })
}

function checkAuth(request) {
  const auth = request.headers.get("Authorization")

  if (!auth || !auth.startsWith("Basic ")) {
    return false
  }

  try {
    const encoded = auth.split(" ")[1]
    const decoded = atob(encoded)
    const [username, password] = decoded.split(":")

    return username === USERNAME && password === PASSWORD
  } catch {
    return false
  }
}

// 以下保持默认，不要动
addEventListener('fetch', event => {
  event.respondWith(fetchAndApply(event.request))
})

async function fetchAndApply(request) {
  if (!checkAuth(request)) {
  return unauthorized()
  }
  const region = (request.headers.get('cf-ipcountry') || '').toUpperCase()
  const ip_address = request.headers.get('cf-connecting-ip')
  const user_agent = request.headers.get('user-agent') || ''

  let response = null
  let url = new URL(request.url)
  let url_hostname = url.hostname

  if (https == true) {
    url.protocol = 'https:'
  } else {
    url.protocol = 'http:'
  }

  if (await device_status(user_agent)) {
    var upstream_domain = upstream
  } else {
    var upstream_domain = upstream_mobile
  }

  url.host = upstream_domain
  if (url.pathname == '/') {
    url.pathname = upstream_path
  } else {
    url.pathname = upstream_path.replace(/\/$/, '') + url.pathname
  }

  if (blocked_region.includes(region)) {
    response = new Response('Access denied: WorkersProxy is not available in your region yet.', {
      status: 403
    })
  } else if (blocked_ip_address.includes(ip_address)) {
    response = new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
      status: 403
    })
  } else {
    let method = request.method
    let request_headers = request.headers
    let new_request_headers = new Headers(request_headers)

    new_request_headers.set('Host', url.hostname)
    new_request_headers.set('Referer', url.href)

    let original_response = await fetch(url.href, {
            method: method,
            headers: new_request_headers
    })

    let original_response_clone = original_response.clone()
    let original_text = null
    let response_headers = original_response.headers
    let new_response_headers = new Headers(response_headers)
    let status = original_response.status

    new_response_headers.set('access-control-allow-origin', '*')
    new_response_headers.delete('content-security-policy')
    new_response_headers.delete('content-security-policy-report-only')
    new_response_headers.delete('clear-site-data')

    const content_type = new_response_headers.get('content-type')
    const content_type_lower = content_type ? content_type.toLowerCase() : ''
    if (content_type_lower.includes('text/html') && content_type_lower.includes('utf-8')) {
      original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname)
    } else {
      original_text = original_response_clone.body
    }

    response = new Response(original_text, {
      status,
      headers: new_response_headers
    })
  }
  return response
}

async function replace_response_text(response, upstream_domain, host_name) {
  let text = await response.text()

  var i, j
  for (i in replace_dict) {
    if (!replace_dict.hasOwnProperty(i)) continue
    j = replace_dict[i]

    if (i == '$upstream') {
      i = upstream_domain
    } else if (i == '$custom_domain') {
      i = host_name
    }

    if (j == '$upstream') {
      j = upstream_domain
    } else if (j == '$custom_domain') {
      j = host_name
    }

    let re = new RegExp(i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    text = text.replace(re, j)
  }
  return text
}

async function device_status(user_agent_info) {
  if (!user_agent_info) return true
  var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"]
  var flag = true
  for (var v = 0; v < agents.length; v++) {
    if (user_agent_info.indexOf(agents[v]) >= 0) {
      flag = false
      break
    }
  }
  return flag
}
