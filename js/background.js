const { isCodiMD } = require('./utils')

function parseCSP(headerValue) {
  return headerValue.split(';').reduce((result, directive) => {
    let [key, ...value] = directive.trim().split(/\s+/g)

    if (!key) {
      return result
    } else {
      key = key.toLowerCase()
    }

    if (key in result) {
      result[key] = result[key].concat(value)
      return result
    } else {
      return {
        ...result,
        [key]: value,
      }
    }
  }, {})
}

function generateCSP(cspStructure) {
  return Object.keys(cspStructure)
    .map(key => {
      return `${key} ${cspStructure[key].join(' ')}`
    })
    .join(';')
}

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    if (!isCodiMD(details.url)) {
      return
    }

    const modifiedHeaders = {}

    for (const header of details.responseHeaders) {
      if (
        header.name.toLowerCase() === 'x-frame-options' &&
        header.value.toLowerCase() === 'deny'
      ) {
        /**
         * Since Chrome doesn't support ALLOW-FROM directive, we ignore the case here.
         */
        modifiedHeaders[header.name.toLowerCase()] = 'SAMEORIGIN'
      } else if (header.name.toLowerCase() === 'content-security-policy') {
        const rules = parseCSP(header.value)

        rules['frame-ancestors'] = rules['frame-ancestors'] || []
        rules['frame-ancestors'] = rules['frame-ancestors'].filter(
          value => !["'none'", "'self'"].includes(value.toLowerCase()),
        )
        rules['frame-ancestors'].push("'self'")

        modifiedHeaders[header.name.toLowerCase()] = generateCSP(rules)
      }
    }

    const dnrRules = Object.entries(modifiedHeaders).map(([name, value]) => ({
      header: name,
      operation: 'set',
      value,
    }))

    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [details.tabId],
      addRules: [
        {
          id: details.tabId,
          action: {
            type: 'modifyHeaders',
            responseHeaders: dnrRules,
          },
          condition: {
            tabIds: [details.tabId],
            resourceTypes: ['sub_frame'],
          },
        },
      ],
    })
  },
  {
    urls: ['<all_urls>'],
    types: ['main_frame'],
  },
  ['responseHeaders', 'extraHeaders'],
)

chrome.tabs.onRemoved.addListener(tabId => {
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
  })
})
