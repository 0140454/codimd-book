# CodiMD Book mode

Display a sidebar like HackMD book mode

Available on [Chrome Web Store](https://chrome.google.com/webstore/detail/codimd-book-mode/apahkbcjkfpaknjebpaoaehpjiedeapa).

## Disclaimer

* **This extension is NOT developed by HackMD team.**
* I develop this extension for personal use.<br/>
  There may be defects I haven't noticed. Please think twice before use.

## Requested Permissions

* webRequest
* webRequestBlocking

## Notice

* Hostname **must** contains `hackmd` or `codimd`; otherwise, this extension will not enable book mode.
  In the other words, if you host CodiMD without domain name, this extension is not for you.
* After markdown is parsed by MarkdownIt, tags in the following will be reserved and others will be removed.
  ```
  h1
  h2
  h3
  h4
  h5
  h6
  ul
  ol
  li
  a
  b
  strong
  i
  em
  s
  sub
  sup
  mark
  ```

## Get Started

1. Install npm dependencies
   ```shell=
   npm install
   ```
2. Build it
   ```shell=
   npm run build
   ```

## How to use?

1. Install extension
2. Open your note for book index
   ```
   https://codimd.your.domain/note
   ```
3. Add `book` to query string
   ```
   https://codimd.your.domain/note?book
   ```
4. Enjoy it

## Difference between book mode in HackMD

* Links will be opened in new tab
  * HackMD ([Reference](https://hackmd.io/book-example#External-Link))
    * `[target=_blank]` is added explicitly
    * Starts with http (non-SSL)
  * This extension
    * `[target=_blank]` is added explicitly
    * Cross-origin