---
date: 2019-03-05T16:42:19+00:00
title: 'A pain in the react: Challenges behind SSR'
description: ''
tags: react, ssr, webpack, javascript
published: false
canonical_url: ''

---
_tl;dr In this post I'll try to show what, in my opnion, are the current pain points on the common ways to do ssr in React, comparing existing solutions in a didactic way._

First of all, what's SSR?. SSR is the acronym for _server side rendering_. On a high level, this means generating the complete web page on the server without having to rely on the client side javascript.

We won't enter on full details of why you'd want to do this, but, it can be mainly motivated by  [SEO concerns](https://www.youtube.com/watch?v=PFwUbgvpdaQ), [accessibility](https://www.svtplay.se/klipp/16183939/reactjs-meetup-svt---english-subtitles?position=173) or just [performance](https://developers.google.com/web/updates/2019/02/rendering-on-the-web).

## Problems behind SSR

If we take a quick look to the [react documentation](https://reactjs.org/docs/react-dom-server.html#rendertostring) server side rendering might be seen as something quite simple. Just import `react-dom/server` and call `renderToString` method. _Easy peasy:_

```js
const http = require('http');
const ReactDOMServer = require('react-dom/server');
const App = require('./App.js');

const server = http.createServer((req, res) => {
  const html = ReactDOMServer.renderToString(
    <App />
  );
  res.send(html);
});

server.listen(8000);
```

Well, sadly this will not work. Mainly because we are used to writing [_jsx_](https://reactjs.org/docs/jsx-in-depth.html) in React, and we tend to forget that it isn't valid javascript. We could change the `<App />`  line to use `React.createElement` but that approach wouldn't escale for all the `App.js` file, the rest of the components and _css_ files (it gets worse if a css pre-processor is used). So, here comes the first problem: _The need of transpiling server code_.

![Won't somebody please think of the data?](./wont-think-data.png)

A common practice is dispatching data fetching on the [_componentDidMount_ lifecycle](https://reactjs.org/docs/react-component.html#componentdidmount). But, do we have that life cycle method on server side?, _spoiler_: **_no_**. Really, it won't make any sense having `componentDidMount` on server, remember that `renderToString` is a synchronous single pass rendering, while on client side, we would call `setState` after data fetching is done in order to trigger another rendering phase. This difference between life cycles leds to several problems, first of all, how can we determine and fetch data before we render on server side?. And second, how can we share the state (which would have been generated with `setState`) between server and client?.

Last but not least, on client side we would trigger data fetching with ajax. Something like making a [fetch](https://developer.mozilla.org/docs/Web/API/Fetch_API) call to an endpoint. This request will have specific information (mainly host information and headers such as the _cookie_ one), how can this be replicated on server side?

To round up, we'll have to deal with the following issues:

1. Generating valid JS code for the server
2. Determine data dependencies
3. Actually fetching data
4. Sharing state _(do not forget to prevent double fetch!)_

## Generating valid JS code for the server

React is known for having a steep configuration in order to get it running. If we check what is considered a _hello world_ example (using [_create react app_](https://facebook.github.io/create-react-app/)) we would realize that we are including like [1300 dependencies](https://npm.anvaka.com/#/view/2d/react-scripts) . All these dependencies deal with a lot of features and requirements that we probably don't need, but, you get the point, it isn't something simple to get react running.

![](./react-dependencies.png "React scripts dependencies")

As far as how could we get valid node js code, we've got several options:

* **Webpack**: apply similar building steps as it's done with the client code
* **Babel:** transpile the code using [babel-cli](https://babeljs.io/docs/en/babel-cli), no bundling.

There are many more options, we could use another bundlers (or compile with zeit's ncc), but it doesn't make much sense to throw new tooling.

Being pedantic, we should not need webpack, babel could be the one and only tool used for generating valid node js code. In fact, webpack will use babel under the hood for transpiling, so we could skip the intermediary. On the nodejs case, bundling isn't something we need, we can have many files and include them via [node's module system](https://nodejs.org/api/modules.html), ie., in a less fancier way, use `require`.

![Babel: One tool to rule them all](./one-tool-to-rule-them-all-min.jpg "One tool to rule them all")

The problem of _the one tool to rule them all approach (ie. only babel)_ is that generally webpack is doing more tasks that only transpiling. For example, are we using css modules?, so, webpack is doing a name mangling of the classes to renerate unique names via [the css loader](https://github.com/webpack-contrib/css-loader). Are we using build time constants?, we are probably defining them with [webpack's define plugin](https://webpack.js.org/plugins/define-plugin/). There are more examples of tasks that webpack is performing (static files, etc, etc), but for each of these tasks we'll have to find a babel preset or plugin that performs this job.

If we stick with the webpack path, although, we won't have the same configuration file for client and server, both files will be very similar, sharing most of its code. Also, most webpack loaders have a sort of explanation of how to use them for server side rendering (for example, css loader has the [_exportOnlyLocals_ option](https://github.com/webpack-contrib/css-loader#exportonlylocals) ).

Well, returning to our objective, we'll need to add some packages:

* Webpack (and webpack cli)
* Babel (preset and loaders)
* React (and react dom)

```bash
yarn add --dev webpack webpack-cli webpack-node-externals @babel/core @babel/preset-env @babel/preset-react babel-loader
yarn add react react-dom
```

You may be wondering what `webpack-node-externals` is, well, on node, we don't want to bundle packages that can be included (`require`) on runtime (all packages from `node_modules` and the standard library), [webpack-node-externals](https://www.npmjs.com/package/webpack-node-externals) does exactly that.

```js
module.exports = [
  // Client configuration
  {
    mode,
    entry: path.join(src, 'client'),
    output: {
      path: dist,
      filename: 'client.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [src],
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { modules: false }],
                  '@babel/preset-react'
                ],
              },
            },
          ],
        },
      ],
    },
  },
  // Server configuration
  {
    mode,
    target: 'node',
    entry: src,
    output: {
      path: dist,
      filename: 'server.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [src],
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: { node: 'current' }}],
                  '@babel/preset-react'
                ],
              },
            },
          ],
        },
      ],
    },
    externals: [
      nodeExternals(),
    ],
  },
];
```