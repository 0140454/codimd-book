function isCodiMD(url) {
  const parsedURL = new URL(url)

  return ['hackmd', 'codimd'].reduce((result, value) => result || parsedURL.hostname.includes(value), false)
}

module.exports = {
  isCodiMD
}
