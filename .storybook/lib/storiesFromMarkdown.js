import remark from 'remark'
import parents from 'unist-util-parents'
import select from 'unist-util-select'
import findBefore from 'unist-util-find-before'
import htmlToReact from 'html-to-react'
import parsePairs from 'parse-pairs'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import {Octicon} from '../Octicon'

const htmlParser = new htmlToReact.Parser()

const railsOcticonToReact = (html) => {
  // <%= octicon "tools" %> to <Octicon name="tools" />
  const octre = /<%= octicon ["']([a-z\-]+)["'] %>/gi
  html = html.replace(octre, (match, name) => {
    return ReactDOMServer.renderToStaticMarkup(<Octicon name={name} />)
  })
  return html
}

const isValidNode = () => {
    return true;
}

const nodeToStory = (node, file) => {
  let html = railsOcticonToReact(node.value)
  const element = htmlParser.parse(html)
  const pairs = node.lang.replace(/^html\s*/, '')
  const attrs = pairs.length ? parsePairs(pairs) : {}
  const title = attrs.title || getPreviousHeading(node) ||
    `story @ ${file}:${node.position.start.line}`
  return {
    title,
    story: () => element,
    attrs,
    html,
    file,
    node,
  }
}

const getPreviousHeading = node => {
  const heading = findBefore(node.parent, node, 'heading')
  return (heading && !heading.used)
    ? (heading.used = true, heading.children.map(c => c.value).join(''))
    : undefined
}

export default req => {
  return req.keys().reduce((stories, file) => {
    const content = req(file)
    const ast = parents(remark.parse(content))
    const path = file.replace(/^\.\//, '')
    return stories.concat(
      select(ast, 'code[lang^=html]')
        .map(node => nodeToStory(node, path))
        .filter(({attrs}) => attrs.story !== "false")
    )
  }, [])
}
