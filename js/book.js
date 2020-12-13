const { isCodiMD } = require('./utils')
const MarkdownIt = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
}).use(
  require('markdown-it-sub')
).use(
  require('markdown-it-sup')
).use(
  require('markdown-it-mark')
)

const KEY_BOOK = 'book'
const ID_CONTAINER = 'book-container'
const ID_SIDEBAR = 'book-sidebar'
const ID_SUMMARY = 'book-summary'
const ID_TOOLBAR = 'book-toolbar'

let activated = false

let container = null
let sidebar = null
let summary = null
let toolbar = null
let searchBox = null

function isBookMode() {
  const searchParams = new URLSearchParams(window.location.search)

  return isCodiMD(window.location.href) && searchParams.has(KEY_BOOK)
}

function getBookId() {
  const searchParams = new URLSearchParams(window.location.search)

  return searchParams.get(KEY_BOOK)
}

function getBookURL() {
  return `${window.location.origin}/${getBookId()}`
}

function getNoteURL() {
  const url = new URL(window.location.href)
  url.searchParams.delete('book')

  return url.href
}

function createComponents() {
  // Recreate page
  document.body.replaceWith(document.createElement('body'))
  // Create sidebar
  sidebar = document.createElement('div')
  sidebar.id = ID_SIDEBAR

  toolbar = document.createElement('div')
  toolbar.id = ID_TOOLBAR

  summary = document.createElement('div')
  summary.id = ID_SUMMARY
  // Create iframe wrapper
  container = document.createElement('div')
  container.id = ID_CONTAINER
  // Insert into DOM
  sidebar.append(toolbar, summary)
  document.body.append(sidebar, container)
}

function renderToolbar() {
  searchBox = document.createElement('div')
  searchBox.className = 'form-group input-group-sm'
  searchBox.innerHTML = '<input class="form-control" placeholder="Search title ...">'
  searchBox.addEventListener('input', () => {
    doSearch()
  })

  const refreshBtn = document.createElement('div')
  refreshBtn.className = 'btn'
  refreshBtn.innerHTML = '<i class="fa fa-refresh"></i>'
  refreshBtn.title = 'Refresh'
  refreshBtn.addEventListener('click', async () => {
    await renderSidebar()
  })

  const editBtn = document.createElement('div')
  editBtn.className = 'btn'
  editBtn.innerHTML = '<i class="fa fa-pencil"></i>'
  editBtn.title = 'Edit'
  editBtn.addEventListener('click', () => {
    const title = summary.querySelector('h1,h2,h3,h4,h5,h6').textContent
    const noteURL = `${getBookURL()}?edit&book=${getBookId()}`

    gotoNote(title, noteURL)
  })

  const toggleBtn = document.createElement('div')
  toggleBtn.className = 'btn'
  toggleBtn.innerHTML = '<i class="fa fa-angle-double-left"></i>'
  toggleBtn.title = 'Toggle'
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('closed')
  })

  toolbar.append(searchBox, refreshBtn, editBtn, toggleBtn)
}

async function renderSidebar() {
  const resp = await fetch(`${getBookURL()}/download`, { cache: 'no-cache' })
  let markdown = await resp.text()
  // Remove YAML metadata
  if (markdown.startsWith('---\n')) {
    const regex = /^---$.*?^(\.|-){3}$/ms
    markdown = markdown.replace(regex, '')
  }
  // Render markdown
  const rendered = document.createElement('div')
  rendered.innerHTML = MarkdownIt.render(markdown)
  // Remove dummy elements
  const acceptedTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a',
    'b', 'strong', 'i', 'em', 's', 'sub', 'sup', 'mark'
  ]
  rendered.querySelectorAll(acceptedTags.map(val => `:not(${val})`).join('')).forEach(elem => elem.remove())
  // Preprocess links
  rendered.querySelectorAll('li').forEach(elem => {
    const anchor = elem.querySelector('a')
    if (!anchor) {
      elem.remove()
      return
    }

    const anchorURL = new URL(anchor.href)
    const regex = /\s*\[target=_blank\]/g

    const hasAttrInPrefix = anchor.previousSibling instanceof Text && regex.test(anchor.previousSibling.wholeText)
    const hasAttrInSuffix = anchor.nextSibling instanceof Text && regex.test(anchor.nextSibling.wholeText)
    const isSameOrigin = window.location.origin === anchorURL.origin
    if (!hasAttrInPrefix && !hasAttrInSuffix && isSameOrigin) {
      return
    }

    anchor.setAttribute('target', '_blank')
    if (hasAttrInPrefix) {
      anchor.previousSibling.data = anchor.previousSibling.data.replace(regex, '')
    }
    if (hasAttrInSuffix) {
      anchor.nextSibling.data = anchor.nextSibling.data.replace(regex, '')
    }
    anchor.innerHTML += '&nbsp;<i class="fa fa-fw fa-external-link"></i>'
  })
  // Cleanup
  rendered.querySelectorAll('ul,ol').forEach(elem => {
    if (elem.textContent.trim()) {
      return
    }

    elem.remove()
  })
  // Preprocess headings
  rendered.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(elem => {
    if (!elem.nextElementSibling || ['UL', 'OL'].indexOf(elem.nextElementSibling.tagName) === -1) {
      return
    }

    const toggleBtn = document.createElement('span')
    toggleBtn.innerHTML = '<i class="fa fa-angle-down"></i>'

    const regex = /\s*\[close\]/g
    if (regex.test(elem.innerHTML)) {
      elem.innerHTML = elem.innerHTML.replace(regex, '')
      elem.classList.add('collapsed')
    }

    elem.classList.add('collapsible')
    elem.innerHTML += toggleBtn.innerHTML
  })
  // Insert into DOM
  summary.innerHTML = rendered.innerHTML
  // Register events
  const bookNoteId = getBookId()
  summary.querySelectorAll('a:not([target="_blank"])').forEach(elem => {
    const elemURL = new URL(elem.href)

    elemURL.searchParams.set('book', bookNoteId)
    elem.setAttribute('data-href', elemURL.href)
    elem.addEventListener('click', event => {
      const noteURL = elem.getAttribute('data-href')

      event.preventDefault()
      event.stopPropagation()

      gotoNote(elem.text, noteURL)
    })
  })

  summary.querySelectorAll('.collapsible').forEach(elem => {
    elem.addEventListener('click', () => {
      elem.classList.toggle('collapsed')
    })
  })

  highlightActiveNote()
  doSearch()
}

function doSearch() {
  const keyword = searchBox.childNodes[0].value.trim().toLowerCase()

  if (!keyword.length) {
    summary.classList.remove('filtered')
  } else {
    summary.classList.add('filtered')
  }

  summary.querySelectorAll('a').forEach(elem => {
    if (elem.textContent.toLowerCase().indexOf(keyword) === -1) {
      elem.classList.add('filtered')
    } else {
      elem.classList.remove('filtered')
    }
  })
}

function highlightActiveNote() {
  summary.querySelectorAll('a:not([target="_blank"])').forEach(elem => {
    let currentURL = new URL(window.location.href)
    let noteURL = new URL(elem.getAttribute('data-href'))

    currentURL = `${currentURL.origin}${currentURL.pathname}`
    noteURL = `${noteURL.origin}${noteURL.pathname}`

    if (currentURL === noteURL) {
      elem.classList.add('active')
    } else {
      elem.classList.remove('active')
    }
  })
}

async function activate() {
  if (activated) {
    return
  }

  createComponents()
  renderToolbar()
  await renderSidebar()

  activated = true
}

function gotoNote(title, url) {
  const noteURL = new URL(url)
  noteURL.searchParams.delete('book')
  // Try to select iframe
  const iframeId = window.btoa(`${noteURL.origin}${noteURL.pathname}`)
  let iframe = container.querySelector(`iframe[id="${iframeId}"]`)
  // Hide other notes
  container.childNodes.forEach(elem => {
    if (elem.id === iframeId) {
      return
    }

    elem.style = 'display: none;'
  })
  // Create iframe if not found
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = iframeId
    iframe.src = noteURL.href

    container.append(iframe)
    iframe.contentWindow.addEventListener('hashchange', event => {
      window.history.replaceState(null, document.title, event.target.location.hash)
    })
  }
  // Show iframe
  iframe.style = ''
  // Manipulate history
  if (title !== null) {
    window.history.pushState(null, document.title, window.location.href)
    document.title = `${title} - ${document.title.split(' - ').reverse()[0]}`
    window.history.replaceState(null, document.title, url)
  }

  highlightActiveNote()
}

async function onStatusChanged() {
  if (!isBookMode()) {
    return
  }

  const currentURL = new URL(window.location.href)
  if (!currentURL.searchParams.get(KEY_BOOK)) {
    const currentNoteId = currentURL.pathname.split('/').reverse()[0]

    if (currentNoteId) {
      currentURL.searchParams.set(KEY_BOOK, currentNoteId)
      window.location = currentURL.href
    }

    return
  }

  await activate()
  gotoNote(null, getNoteURL())
}

function init() {
  window.addEventListener('DOMContentLoaded', onStatusChanged)
  window.addEventListener('popstate', onStatusChanged)
}

init()
