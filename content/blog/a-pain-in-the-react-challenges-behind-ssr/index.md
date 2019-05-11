---
date: 2019-03-05T16:42:19.000+00:00
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
2. Determining data dependencies
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

Instead of separating build phases of server and client will use [webpack's array configuration](https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations):

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

I won't enter into details about babel presets, [babel-preset-env](https://babeljs.io/docs/en/babel-preset-env) is the easiest way to support new ECMA syntax and [babel-preset-react](https://babeljs.io/docs/en/babel-preset-react) allow us to write jsx.

[Full example can be found here](https://github.com/NickCis/a-pain-in-the-react-challenges-behind-ssr/tree/master/1-webpack-ssr).

So, are we done?. The quick answer is no. This example was the minimum to get React server side rendering running, it lacks of many features (no css, no static files, no source map, no production optimization, no vendor bundle, no code spliting, etc). Although, we could start building a full project from this, it isn't recommended. Now a days, we probably will use a tool that abstract all this configuration, such as [razzle](https://github.com/jaredpalmer/razzle), [next.js](https://github.com/zeit/next.js) or [react-server](https://github.com/redfin/react-server). The idea of the example was to understand, on a higher level, how these tools work under the hood.

_For the following examples we will use razzle to reduce the needed boilerplate._

## Determining data dependencies

As I have said before, React on server behaves differently than on client. When calling [_renderToString_](https://reactjs.org/docs/react-dom-server.html#rendertostring)_,_ we are doing a sync one pass render. This means that in order to generate the complete page we will have to figure out how to fetch all the needed data before rendering.

There are mainly two approaches to solve this problem:

* A Page / Route based approach ([NextJs's getInitialProps ](https://nextjs.org/docs#fetching-data-and-component-lifecycle)or [Afterjs's _getInitialProps_](https://github.com/jaredpalmer/after.js/blob/master/README.md#getinitialprops-ctx--data))
* Component tree based approach ([Apollo's _getDataFromTree_](https://www.apollographql.com/docs/react/features/server-side-rendering#getDataFromTree))

The first approach relies heavily on using a router that works inside and outside the react world. Firstly, we would define Pages or Routes, ie, React components that will be rendered when a particular url is fetched. This can be done in many ways, eg, [NextJs's uses a filename convention](https://nextjs.org/docs), or we could just have a routes object where urls are mapped to specific components.

It is important to note that we will only take into account data dependencies of pages (or routes), child components will be ignored. This is also highlighted on [NextJs's doc](https://nextjs.org/docs#fetching-data-and-component-lifecycle):

> _Note:_ `getInitialProps` _can **not** be used in children components. Only in_ `pages`_._

So, the idea will be something like the following:

1. Get the url from the request
2. Determine the pages that will be rendered for that url
3. Call `getInitialProps` (or the data fetching method of the page)

We'll start writing a _routes_ file in order to define what pages are rendered with each urls:

```js
import Home from './Home';
import Other from './Other';

const routes = [
  {
    path: '/',
    component: Home,
    exact: true
  },
  {
    path: '/other',
    component: Other,
    exact: true
  }
];

export default routes;
```

Next step is to determine what pages match the requested url. To achieve this, we'll use [React Router's ](https://reacttraining.com/react-router/web/api/matchPath)`matchPath` function, and then call the `getInitialProps` static method if it exists:

```js
server
  .get('/*', async (req, res) => {
    // Requested url
    const url = req.url;

    // XXX: should handle exceptions!
    await Promise.all(routes.map(route => {
      const match = matchPath(url, route);
      const { getInitialProps } = route.component;

      return match && getInitialProps
        ? getInitialProps()
        : undefined;
    }));
  
    // render
  });
```

On client side, we'll have to add some code to run the `getInitialProps` method (something like the [After component does in afterjs](https://github.com/jaredpalmer/after.js/blob/master/src/After.tsx)).

For the sake of simplicity, we'll follow a slightly different approach than _afterjs_. On the `componentDidMount` and `componentDidUpdate` methods, we'll just call `getInitialProps` :

```js
class Home extends Component {
  static async getInitialProps() {
    console.log('Fetching Home!');
  }

  componentDidMount() {
    Home.getInitialProps();
  }

  componentDidUpdate(prevProps){
    // Only fetch data if location has changed
    if (this.props.location != prevProps.location)
      Home.getInitialProps();
  }

  render() {
    return (
      <div className="Home">
        This is the home!
      </div>
    );
  }
}

```