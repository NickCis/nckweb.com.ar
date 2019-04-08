---
date: 2019-03-05T16:42:19+00:00
title: 'A pain in the react: Challenges behind SSR'
description: ''
tags: ''
published: false
canonical_url: ''

---
tl;dr In this post I'll try to show what, in my opnion, are the current pain points on the common ways to do ssr in React, comparing existing solutions in a didactic way.

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

A common practice is dispatching data fetching on the `[componentDidMount](https://reactjs.org/docs/react-component.html#componentdidmount)`[ life cycle](https://reactjs.org/docs/react-component.html#componentdidmount). But, do we have that life cycle method on server side?, _spoiler_: **_no_**. Really, it won't make any sense having `componentDidMount` on server, remember that `renderToString` is a synchronous single pass rendering, while on client side, we would call `setState` after data fetching is done in order to trigger another rendering phase. This difference between life cycles leds to several problems, first of all, how can we determine and fetch data before we render on server side?. And second, how can we share the state (which would have been generated with `setState`) between server and client?.

Last but not least, on client side we would trigger data fetching with ajax. Something like making a [fetch](https://developer.mozilla.org/docs/Web/API/Fetch_API) call to an endpoint. This request will have specific information (mainly host information and headers such as the _cookie_ one), how can this be replicated on server side?  

To round up, we'll have to deal with the following issues:

1. Generating valid JS code for the server
2. Determine data dependencies
3. Actually fetching data
4. Sharing state _(do not forget to prevent double fetch!)_