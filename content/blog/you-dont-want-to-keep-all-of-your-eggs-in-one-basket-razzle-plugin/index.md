---
published: true
title: 'You don''t want to keep all of your eggs in one basket: razzle plugin (II)'
date: 2019-03-04T03:00:00+00:00
description: Reducing boilerplate of specific device bundles implementing a custom
  Razzle plugin
tags: react, webpack, javascript, nodejs, razzlejs
canonical_url: ''

---
This is a round up of the first talk I did called [_“No metas todo en la misma bolsa: generando bundles por dispositivo”_](https://www.meetup.com/es/React-js-en-Buenos-Aires/events/252948807/) (which could be translated to the title of this article).

![Defining specific characteristics per device without developing a platform for each one.](./2018-07-reactjs-no-metas-todo-en-la-misma-bolsa.png)**This is the second post in a series** where I explain how to encapsulate the specific device logic into a Razzle plugin:

* [Building bundles per device](https://medium.com/@nickcis/you-dont-want-to-keep-all-of-your-eggs-in-one-basket-building-bundles-per-device-887e21772453)
* _Avoiding boilerplate: Developing a razzle plugin (this post)_
* _Generalizing: Developing a webpack plugin (wip)_

***

_tl;dr; the idea is to reduce the needed boilerplate in order to serve particular experiences for each device._

This post will be more code related, I’ll show how I encapsulated the specific device logic into a razzle plugin and all the problems I’ve had to sort that out. In the end, there will be a working example of this feature.

## Razzle

Well, first of all, what is [Razzle](https://github.com/jaredpalmer/razzle)?:

> Universal JavaScript applications are tough to setup. Either you buy into a framework like [Next.js](https://github.com/zeit/next.js) or [react-server](https://github.com/redfin/react-server), fork a boilerplate, or set things up yourself. Aiming to fill this void, Razzle is a tool that abstracts all complex configuration needed for SSR into a single dependency — giving you the awesome developer experience of [create-react-app](https://github.com/facebookincubator/create-react-app), but then leaving the rest of your app’s architectural decisions about frameworks, routing, and data fetching up to you. With this approach, Razzle not only works with React, but also Reason, Elm, Vue, Angular, and most importantly……whatever comes next.

In shorts, it’s a tool that let’s you concentrate on developing the app instead of setting up all the SSR configuration. I’ve been using it since the 0.8 version and I really liked. Version 2.0 introduced plugins in order to modify webpack set up. And this last feature is what will be used.

## Plugins

[Razzle plugins](https://github.com/jaredpalmer/razzle#writing-plugins) are functions that are called [after razzle creates the webpack config object](https://github.com/jaredpalmer/razzle/blob/master/packages/razzle/config/createConfig.js#L605).

```js
'use strict';

module.exports = function myRazzlePlugin(config, env, webpack, options) {
  const { target, dev } = env;

  if (target === 'web') {
    // client only
  }

  if (target === 'server') {
    // server only
  }

  if (dev) {
    // dev only
  } else {
    // prod only
  }

  // Do some stuff...
  return webpackConfig;
};
```

This function is called for each configuration (web and node) and allows you to modify and return a new configuration object.

Keep in mind that what returns the last plugin will be [thrown to webpack](https://github.com/jaredpalmer/razzle/blob/master/packages/razzle/scripts/build.js#L90). I will abuse of this, webpack’s config object will be replaced with an array in order to use the _multicompiler_ feature.

## DeviceModuleReplacementPlugin

The magic behind the device module implementation is resolving to a device specific module, instead of the required one. As it was explained in the first post, the idea is that if a file with the device extension ( `<filename>.<device>.js`) exists, it will be used instead of the regular file ( `<filename>.js`).

On the first post, [webpack’s NormalModuleReplacement](https://webpack.js.org/plugins/normal-module-replacement-plugin/) plugin was used, in order to clean things up, a new webpack plugin was developed.

I won’t enter into details of how webpack internally work as this was mostly inspired [by NormalModuleReplacement code](//%20https://github.com/webpack/webpack/blob/master/lib/NormalModuleReplacementPlugin.js):

```js
class NormalModuleReplacementPlugin {
    // ...
  
	apply(compiler) {
		const resourceRegExp = this.resourceRegExp;
		const newResource = this.newResource;
		compiler.hooks.normalModuleFactory.tap(
			"NormalModuleReplacementPlugin",
			nmf => {
				nmf.hooks.beforeResolve.tap("NormalModuleReplacementPlugin", result => {
					if (!result) return;
					if (resourceRegExp.test(result.request)) {
						if (typeof newResource === "function") {
							newResource(result);
						} else {
							result.request = newResource;
						}
					}
					return result;
				});
				nmf.hooks.afterResolve.tap("NormalModuleReplacementPlugin", result => {
					if (!result) return;
					if (resourceRegExp.test(result.resource)) {
						if (typeof newResource === "function") {
							newResource(result);
						} else {
							result.resource = path.resolve(
								path.dirname(result.resource),
								newResource
							);
						}
					}
					return result;
				});
			}
		);
	}
}
```

To summarize things, imported files are called modules. Webpack has a normal module factory that is encharged of creating the entity that represents that module. Plugins can hook to certain events of this factory in order to change custom behavior.

The idea is to hook up to the `beforeResolve` and `afterResolve` events in order to modify the requested module, just as _nomal module replacement plugin_ does. But, as this is a custom plugin, it has access to webpack’s internal resolver which will be used to check if the device specific file (_aka module)_ exists.

```js
class DeviceModuleReplacementPlugin {
  resolveByDevice(nmf, result, callback = () => {}) {
    const resolver = nmf.getResolver('normal', result.resolveOptions);
    const request = result.request.split('!');
    const { root, dir, name, ext } = path.parse(request.pop());
    const contextInfo = result.contextInfo || result.resourceResolveData.context;
    const device = contextInfo.compiler.split('.')[0];
    const file = path.format({
      root,
      dir,
      name,
      ext: `.${device}${ext}`
    });

    resolver.resolve(contextInfo, result.context, file, {}, err => {
      if (!err) {
        request.push(file);
        result.request = request.join('!');
      }

      callback();
    });
  }

  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap(
      'DeviceModuleReplacementPlugin',
      nmf => {
        nmf.hooks.beforeResolve.tapAsync('DeviceModuleReplacementPlugin', (result, callback) => {
          if (!result) return callback();
          if (!result.context.startsWith(this.folder)) return callback();
          this.resolveByDevice(nmf, result, callback);
        });

        nmf.hooks.afterResolve.tapAsync('DeviceModuleReplacementPlugin', (result, callback) => {
          if (!result) return callback();
          if (!result.context.startsWith(this.folder)) return callback();
          this.resolveByDevice(nmf, result, callback);
        });
      }
    );
  }
}
```

As a side note, remember that Webpack allows to declare [loaders using an inline syntax](https://webpack.js.org/concepts/loaders/#inline). This means that a _resource_ might be something like this:

```js
import Styles from 'style-loader!css-loader?modules!./styles.css';
```

Data is piped using an exclamation mark ( `!`) and the file is always at last.

## Web bundle

As far as configuration for web bundle is concerned, only two things has to be done:

1. Generate one bundle per device
2. Replace modules with device specific ones

To achieve the first objective, it is going to be abuse the fact that the modified configuration is passed directly to webpack. The returned object will be replaced by an array. Each item of the array is going to be the configuration for each device.

As regards the second, D_eviceModuleReplacementPlugin_ will do the trick. This plugin will be added to the original config.

```js
function web(config, { devices }, webpack) {
  const clients = devices.map(device => ({
    ...config,
    name: `${device}.client`,
    entry: {
      [`${device}.client`]: config.entry.client,
    },
    output: {
      ...config.output,
      filename: config.output.filename.replace('bundle', `${device}.bundle`),
      chunkFilename: config.output.chunkFilename.replace('[name]', `${device}.[name]`),
    },
    plugins: [
      ...config.plugins,
      new webpack.DefinePlugin({
        'process.device': JSON.stringify(device),
      }),
      new DeviceModuleReplacementPlugin(path.resolve('./src')),
    ],
  }));

  return clients;
}
```

After some tests, I’ve realized that dev server stopped working as expected. I got some _CORS_ errors on the browser’s console and the bundle failed to load:

![Browser's dev console errors while using dev server](./browser-console-error.png)

To understand a bit what was happening, I had to pay special attention to the [_How razzle works (the secret sauce_](https://github.com/jaredpalmer/razzle#how-razzle-works-the-secret-sauce)_)_ part of the readme:

> In development mode (`razzle start`), Razzle bundles both your client and server code using two different webpack instances running with Hot Module Replacement in parallel. While your server is bundled and run on whatever port you specify in `src/index.js` (`3000` is the default), the client bundle (i.e. entry point at `src/client.js`) is served via `webpack-dev-server` on a different port (`3001` by default) with its `publicPath` explicitly set to `localhost:3001` (and not `/` like many other setups do). Then the server's html template just points to the absolute url of the client JS: `localhost:3001/static/js/client.js`. Since both webpack instances watch the same files, whenever you make edits, they hot reload at _exactly_ the same time. Best of all, because they use the same code, the same webpack loaders, and the same babel transformations, you never run into a React checksum mismatch error.

My best bet is that I was somehow overriding dev server configuration. Checking [razzle’s start script](https://github.com/jaredpalmer/razzle/blob/master/packages/razzle/scripts/start.js#L72), I came across that the `devServer` property of webpack’s configuration was being used:

```js
  // Create a new instance of Webpack-dev-server for our client assets.
  // This will actually run on a different port than the users app.
  const clientDevServer = new devServer(clientCompiler, clientConfig.devServer);

  // Start Webpack-dev-server
  clientDevServer.listen(
    (process.env.PORT && parseInt(process.env.PORT) + 1) || razzle.port || 3001,
    err => {
      if (err) {
        logger.error(err);
      }
    }
  );
```

Just setting that property to the returned array fixed the problem:

```js
function web(config, { devices }, webpack) {
  const clients = devices.map(device => ({
    ...config,
    name: `${device}.client`,
    entry: {
      [`${device}.client`]: config.entry.client,
    },
    output: {
      ...config.output,
      filename: config.output.filename.replace('bundle', `${device}.bundle`),
      chunkFilename: config.output.chunkFilename.replace('[name]', `${device}.[name]`),
    },
    plugins: [
      ...config.plugins,
      new webpack.DefinePlugin({
        'process.device': JSON.stringify(device),
      }),
      new DeviceModuleReplacementPlugin(path.resolve('./src')),
    ],
  }));

  clients.devServer = config.devServer;

  return clients;
}
```

## Node bundle (or must i say bundles?)

DevServer

After finishing, I realized that dev server was

[https://github.com/NickCis/razzle-plugin-device-specific-bundles](https://github.com/NickCis/razzle-plugin-device-specific-bundles "https://github.com/NickCis/razzle-plugin-device-specific-bundles")