---
title: "You don’t want to keep all of your eggs in one basket: building bundles per device"
date: "2019-01-21T15:00:00.000Z"
published: true
description: Nowadays it is normal to run into websites that have optimized versions for, among others, mobile and desktop experiences. Here i'll explore some ways to achieve that.
tags: react, webpack, javascript, nodejs
canonical_url: "https://medium.com/@nickcis/you-dont-want-to-keep-all-of-your-eggs-in-one-basket-building-bundles-per-device-887e21772453"
---

This is a round up of the first talk I did called [“No metas todo en la misma bolsa: generando bundles por dispositivo”](https://drive.google.com/file/d/1vnsMVslNssKV3W3Mv_i2ZwCa5Gh9GZp3/view?usp=sharing) (which could be translated to the title of this article).

**This is the first post in a series** where I explain how to build a react progressive web application that targets specific devices constraints:

* Building bundles per device (this post)

* *Avoiding boilerplate: Developing a razzle plugin (wip)*

* *Generalizing: Developing a webpack plugin (wip)*

*tl;dr; the idea is to incrementally start serving particular experiences for each device (i.e: Mobile / Desktop) in the lazy programming way.*

In this post, I’ll give a background about the problem to be solved and the first attempt to do it. Although, the post will talk about a concrete feature, I won’t be showing too much code, the following posts will have working examples.

## The problem

As every developer knows, problems are created by the product team.

We’ve started having UI requirements that were too specific for each device. Some of these often involved using libraries which only target that device (e.g.: drag & drop capabilities were only needed on desktop, not mobile).

Bundle size started to rise, code started to get dirty and differences between devices got worse and worse.

At the time, the PWA team was a small team (only ~5 devs), we just could fork the platform and treat each device as a particular development. In addition, we had a working product, we needed to make changes incrementally.

*Although many teams may have this problem, the developed solution isn’t a silver bullet. It addressed our particular constraints and characteristics. In this post, my objective is to give some insights about the process of how that solution has been reached.*

## The stack

First of all, i’ll have to do a brief introduction about the stack in which the platform is developed.

![PWA technology stack](https://cdn-images-1.medium.com/max/2000/1*p1ETwfOiTM5TvXyzzEIvlQ.png)*PWA technology stack*

The PWA uses the usual React+Redux+React router stack bundled with webpack.

The server code is transpiled with babel in order to re use react component to do server side rendering.

Backends are external microservices. The PWA’s server has a proxy in order to communicate with them.

## Options

As i’ve said before, the idea was to start optimizing the platform for each device.

We thought of three possible approaches:

* **Adaptative / Responsive design**: serving the same javascript, css bundles and html for all clients and using responsive sizes and media queries in order to change the user experience according to the device’s width.

* **Separate Sites**: Developing a fork for each device. This would involve to start moving common code to packages or something similar in order to avoid code duplication.

* **Dynamic Serving:** Serving different content (js, css bundles) depending on the requests headers (mainly the *UserAgent*). The problem of this approach is to investigate a way of building the different bundles without having to do radical changes on the current code.

We were using the Adaptative / Responsive approach which lead to some problems:

* Client received the web *duplicated*, both mobile and desktop components.

* Code became a bit messy

* Client received unnecessary libraries (ie: mobile clients also received desktop only libraries)

We want to reduce initial learning curve for developers (easy developer’s transition) and the long term maintaining effort. As far as the separate sites approach, we should fork the current codebase and maintain different codebases (a huge long term maintaining effort) or refactor the current codebase in order to extract all the common code and then fork (hard transition, as developers should understand how to write the common code in order to share it between forks). So, this approach was a no op.

## Dynamic Serving

We end up going for the *dynamic serving *approach. In order to do, we should resolve some problems:

* find out how to guess what device is the client (ie: is it mobile?, desktop?)

* generate device specific bundles

The company already had a [DeviceAtlas](https://deviceatlas.com/) contract, so it was an easy choice. DeviceAtlas is a device detection solution for parsing User Agent strings in the web environment, so it was just what we needed.

![Proposed architecture](https://cdn-images-1.medium.com/max/2000/1*T98VqxYZ0LNFIEesZa0i-Q.png)*Proposed architecture*

The following problem was building device specific bundles without having to make huge changes on the way developer’s work. The idea was trying to resolve everything on compile time, so we don’t get any runtime penalties while also having a easy developer experience.

Ideally, a developer would write a component like this:

![](https://cdn-images-1.medium.com/max/2588/0*r8jJyY8WVUcv1NVq)

While having the following file structure:

![](https://cdn-images-1.medium.com/max/2000/1*Dp52k5fF32sAEMIYBH2SHw.png)

And for each device bundle, it would resolve to the appropriate file (ie: *DeviceSpecificComponent.mobile.js* for the mobile bundle, *DeviceSpecificComponent.desktop.js* for the desktop one, and so on).

Luckily, Webpack has a plugin called [NormalModuleReplacementPlugin](https://webpack.js.org/plugins/normal-module-replacement-plugin/) which allows to change the resource resolution. But, in order to build a bundle for each device using this approach, it requires to make a compilation for each device. To address this issue, webpack has the [multi-compiler feature](https://github.com/webpack/webpack/tree/master/examples/multi-compiler).

![NormalModuleReplacementPlugin configuration](https://cdn-images-1.medium.com/max/3200/1*p2e3sImWmwi3EcOTXVp1kA.png)*NormalModuleReplacementPlugin configuration*

To recap:

* two builds for each device, one build for the node server ssr and another one for the browser.

* one server which *requires* all device specific SSR bundles, uses DeviceAtlas to find out what type of device is the client, runs the specific SSR device bundle and servers the specific device bundle

* the developer doesn’t have to think about what device he/she is targeting, only include the component and write the device specific implementation (using the file naming convention).

In the next post in this series, i will talk about how can all the boilerplate to implement this feature can be abstracted into a razzle plugin. There will be more concise examples with working code!
