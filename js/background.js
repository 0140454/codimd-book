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
        const cspStructure = parseCSP(header.value)

        if ('frame-ancestors' in cspStructure) {
          const values = cspStructure['frame-ancestors']
          const noneIndex = values.findIndex(
            value => value.toLowerCase() === 'none',
          )
          const selfIndex = values.findIndex(
            value => value.toLowerCase() === 'self',
          )

          if (noneIndex !== -1) {
            values.splice(noneIndex, 1)
          }
          if (selfIndex === -1) {
            values.push('self')
          }
        }

        modifiedHeaders[header.name.toLowerCase()] = generateCSP(cspStructure)
      }
    }

    const dnrRules = Object.entries(modifiedHeaders)
      .map(([name, value]) => ({
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
