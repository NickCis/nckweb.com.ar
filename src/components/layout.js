import React from "react"
import { Link } from "gatsby"

import { rhythm } from "../utils/typography"

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props
    const rootPath = `${__PATH_PREFIX__}/`
    let header

    if (location.pathname === rootPath) {
      header = (
        <h1
          className="title"
          style={{
            marginBottom: rhythm(1.5),
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h1>
      )
    } else {
      header = (
        <h3
          style={{
            textTransform: 'uppercase',
            color: '#f47c48',
            fontFamily: `Montserrat, sans-serif`,
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h3>
      )
    }
    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <header>{header}</header>
        <main>{children}</main>
        <footer>
          <a
            href="https://twitter.com/nickcis"
            target="_blank"
            rel="noopener noreferrer"
          >
            twitter
          </a>
          {' '}&bull;{' '}
          <a
            href="https://github.com/nickcis"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
          {' '}&bull;{' '}
          <a
            href="https://medium.com/@nickcis"
            target="_blank"
            rel="noopener noreferrer"
          >
            medium
          </a>
        </footer>
      </div>
    )
  }
}

export default Layout
